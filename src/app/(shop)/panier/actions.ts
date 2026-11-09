"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { canReserve, sizeAvailability } from "@/lib/catalog";
import { getCartDetails, readCart, readPromoCode, writeCart, writePromoCode } from "@/lib/cart";
import { checkPromo, normalizeCode } from "@/lib/promo";
import { OrderError, createOrder, expireUnpaidOrders, notifyOrderCreated } from "@/lib/order-service";
import { MAX_QTY_PER_LINE, normalizePhone } from "@/lib/orders";
import { getPublicCatalog } from "@/lib/queries";
import { expireCatalog } from "@/lib/revalidate";

export async function addToCart(productId: string, size: string) {
  const product = (await getPublicCatalog()).find((p) => p.id === productId);
  const s = product?.sizes.find((x) => x.size === size);
  if (!product || !s || product.status !== "online" || !canReserve(sizeAvailability(product, s.stock))) {
    return { error: "Cette pointure n'est plus disponible." };
  }
  const lines = await readCart();
  const existing = lines.find((l) => l.p === productId && l.s === size);
  if (existing) existing.q = Math.min(existing.q + 1, MAX_QTY_PER_LINE);
  else lines.push({ p: productId, s: size, q: 1 });
  await writeCart(lines);
  redirect("/panier");
}

export async function updateCartLine(productId: string, size: string, qty: number) {
  const lines = await readCart();
  const next =
    qty <= 0
      ? lines.filter((l) => !(l.p === productId && l.s === size))
      : lines.map((l) => (l.p === productId && l.s === size ? { ...l, q: Math.min(Math.floor(qty), MAX_QTY_PER_LINE) } : l));
  await writeCart(next);
}

export async function applyPromo(_prev: unknown, formData: FormData) {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const { subtotal } = await getCartDetails();
  const r = await checkPromo(code, subtotal);
  if ("error" in r) return { error: r.error };
  await writePromoCode(r.promo.code);
  return { error: null };
}

export async function removePromo() {
  await writePromoCode("");
}

const checkout = z.object({
  firstName: z.string().trim().min(1, "Prénom obligatoire").max(60),
  lastName: z.string().trim().min(1, "Nom obligatoire").max(60),
  email: z.email("E-mail invalide").max(200),
  phone: z.string().trim().min(1, "Téléphone obligatoire"),
  address1: z.string().trim().min(3, "Adresse obligatoire").max(200),
  address2: z.string().trim().max(200),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Code postal à 5 chiffres"),
  city: z.string().trim().min(1, "Ville obligatoire").max(100),
  customerNote: z.string().trim().max(500),
  cgv: z.literal("on", { error: "Tu dois accepter les conditions générales de vente" }),
});

export type CheckoutState = { error?: string; errors?: Record<string, string> } | null;

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (formData.get("website")) return { error: "Envoi refusé." }; // champ piège anti-robots
  const raw = Object.fromEntries(
    ["firstName", "lastName", "email", "phone", "address1", "address2", "postalCode", "city", "customerNote", "cgv"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );
  raw.email = raw.email.trim().toLowerCase();
  const parsed = checkout.safeParse(raw);
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  const phone = normalizePhone(raw.phone);
  if (raw.phone && !phone) errors.phone = "Numéro de téléphone invalide";
  if (!parsed.success || !phone) return { errors, error: "Vérifie les champs en rouge." };

  const d = parsed.data;
  let token: string;
  try {
    // Libère d'abord les réservations expirées : une paire bloquée depuis 48 h redevient disponible.
    await expireUnpaidOrders();
    const promo = await readPromoCode();
    const order = await createOrder(await readCart(), {
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone,
      address1: d.address1,
      address2: d.address2 || null,
      postalCode: d.postalCode,
      city: d.city,
      customerNote: d.customerNote || null,
    }, promo || undefined);
    token = order.token;
    // E-mails (client + admin) envoyés après la réponse : la page de confirmation s'affiche sans attendre.
    after(() => notifyOrderCreated(order.id));
  } catch (e) {
    if (e instanceof OrderError) {
      expireCatalog();
      return { error: e.message };
    }
    console.error(e);
    return { error: "Un problème est survenu, réessaie dans un instant." };
  }
  await writeCart([]);
  await writePromoCode("");
  expireCatalog();
  redirect(`/commande/${token}?nouvelle=1`);
}

