"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { sendEmail } from "@/lib/email";
import { adminRequestEmail } from "@/lib/email-templates";

const input = z.object({
  token: z.string().min(10).max(64),
  type: z.enum(["probleme", "retour"]),
  message: z.string().trim().min(10, "Décris ta demande en quelques mots (10 caractères minimum).").max(2000),
});

export async function submitRequest(_prev: unknown, formData: FormData) {
  const parsed = input.safeParse({ token: formData.get("token"), type: formData.get("type"), message: formData.get("message") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { token, type, message } = parsed.data;
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.token, token));
  if (!order || ["pending_payment", "cancelled"].includes(order.status)) return { ok: false, error: "Demande impossible pour cette commande." };
  const open = await db.select({ id: schema.customerRequests.id, handledAt: schema.customerRequests.handledAt }).from(schema.customerRequests).where(eq(schema.customerRequests.orderId, order.id));
  if (open.filter((r) => !r.handledAt).length >= 3) return { ok: false, error: "Tu as déjà des demandes en cours : on te répond très vite." };
  await db.insert(schema.customerRequests).values({ orderId: order.id, type, message });
  await db.insert(schema.orderEvents).values({ orderId: order.id, actor: "client", message: type === "retour" ? "Demande de retour envoyée." : "Problème signalé." });
  const admins = await db.select({ email: schema.adminUsers.email }).from(schema.adminUsers);
  const mail = adminRequestEmail(order, type, message);
  for (const a of admins) await sendEmail({ to: a.email, subject: mail.subject, html: mail.html, kind: "admin_request", orderId: order.id });
  refresh();
  return { ok: true, error: null };
}
