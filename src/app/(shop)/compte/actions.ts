"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { consumeLoginToken, createLoginToken, getCustomer, logoutCustomer } from "@/lib/customer-auth";
import { sendEmail } from "@/lib/email";
import { loginEmail } from "@/lib/email-templates";
import { normalizePhone } from "@/lib/orders";
import { SITE } from "@/lib/site";

async function sendLink(email: string) {
  const token = await createLoginToken(email);
  if (!token) return false;
  const mail = loginEmail(`${SITE.url}/compte/verifier?jeton=${token}`);
  await sendEmail({ to: email, subject: mail.subject, html: mail.html, kind: "login" });
  return true;
}

export async function requestLoginLink(_prev: unknown, formData: FormData) {
  const parsed = z.email().max(200).safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { ok: false, error: "Adresse e-mail invalide." };
  const sent = await sendLink(parsed.data);
  if (!sent) return { ok: false, error: "Trop de demandes. Réessaie dans quelques minutes." };
  return { ok: true, email: parsed.data, error: null };
}

/** Depuis une commande passée sans compte : envoie le lien à l'e-mail de la commande. */
export async function requestLinkForOrder(token: string) {
  const [order] = await db.select({ email: schema.orders.email }).from(schema.orders).where(eq(schema.orders.token, token));
  if (!order) return { ok: false, error: "Commande introuvable." };
  const sent = await sendLink(order.email);
  return sent ? { ok: true, error: null } : { ok: false, error: "Trop de demandes. Réessaie dans quelques minutes." };
}

/** Le lien de l'e-mail ouvre une page avec un bouton : les antivirus de messagerie qui « visitent » les liens ne le consomment pas. */
export async function confirmLogin(formData: FormData) {
  const token = String(formData.get("jeton") ?? "");
  const customer = token ? await consumeLoginToken(token) : null;
  if (!customer) redirect("/compte/connexion?expire=1");
  redirect("/compte");
}

export async function logout() {
  await logoutCustomer();
  redirect("/");
}

const profile = z.object({
  firstName: z.string().trim().max(60),
  lastName: z.string().trim().max(60),
  phone: z.string().trim().max(30),
  address1: z.string().trim().max(200),
  address2: z.string().trim().max(200),
  postalCode: z.string().trim().regex(/^(\d{5})?$/, "Code postal à 5 chiffres"),
  city: z.string().trim().max(100),
});

export async function updateProfile(_prev: unknown, formData: FormData) {
  const customer = await getCustomer();
  if (!customer) redirect("/compte/connexion");
  const parsed = profile.safeParse(Object.fromEntries(Object.keys(profile.shape).map((k) => [k, String(formData.get(k) ?? "")])));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) return { ok: false, error: "Numéro de téléphone invalide." };
  await db
    .update(schema.customers)
    .set({ ...d, phone, firstName: d.firstName || null, lastName: d.lastName || null, address2: d.address2 || null })
    .where(eq(schema.customers.id, customer.id));
  return { ok: true, error: null };
}

/**
 * Suppression du compte (RGPD) : le profil est effacé.
 * Les commandes passées restent conservées, comme l'exige la loi pour les ventes (obligations comptables).
 */
export async function deleteAccount() {
  const customer = await getCustomer();
  if (!customer) redirect("/compte/connexion");
  await db.delete(schema.loginTokens).where(eq(schema.loginTokens.email, customer.email));
  await db.delete(schema.customers).where(eq(schema.customers.id, customer.id));
  await logoutCustomer();
  redirect("/?compte-supprime=1");
}
