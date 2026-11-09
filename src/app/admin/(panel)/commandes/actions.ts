"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  OrderError,
  changeOrderStatus,
  expireUnpaidOrders,
  extendPaymentDelay,
  notifyDelay,
  notifyStatus,
  shipOrder,
} from "@/lib/order-service";
import { CARRIERS, ORDER_STATUS, type OrderStatusCode } from "@/lib/orders";
import { expireCatalog } from "@/lib/revalidate";

const id = z.uuid();
const statuses = Object.keys(ORDER_STATUS) as [OrderStatusCode, ...OrderStatusCode[]];
type Result = { ok?: boolean; error?: string };

async function guard(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Données invalides." };
    throw e;
  }
}

export async function setOrderStatus(orderId: string, status: OrderStatusCode, opts: { restock?: boolean; message?: string } = {}) {
  const admin = await requireAdmin();
  return guard(async () => {
    const s = z.enum(statuses).parse(status);
    const oid = id.parse(orderId);
    const { stockChanged } = await changeOrderStatus(oid, s, admin.name, {
      restock: opts.restock,
      message:
        opts.message ??
        (s === "paid"
          ? "Paiement reçu, commande validée."
          : s === "cancelled"
            ? "Commande annulée, paires remises en stock."
            : `Passée en « ${ORDER_STATUS[s].label} ».`),
    });
    if (stockChanged) expireCatalog();
    await notifyStatus(oid, s);
  });
}

const shipping = z.object({
  carrier: z.enum(Object.keys(CARRIERS) as [string, ...string[]], { error: "Choisis un transporteur" }),
  trackingNumber: z.string().trim().min(4, "Numéro de suivi trop court").max(60),
});

export async function shipOrderAction(orderId: string, carrier: string, trackingNumber: string) {
  const admin = await requireAdmin();
  return guard(async () => {
    const d = shipping.parse({ carrier, trackingNumber });
    const oid = id.parse(orderId);
    await shipOrder(oid, d.carrier, d.trackingNumber.replace(/\s+/g, ""), admin.name);
    await notifyStatus(oid, "shipped");
  });
}

export async function updateTracking(orderId: string, carrier: string, trackingNumber: string) {
  await requireAdmin();
  return guard(async () => {
    const d = shipping.parse({ carrier, trackingNumber });
    await db
      .update(schema.orders)
      .set({ carrier: d.carrier, trackingNumber: d.trackingNumber.replace(/\s+/g, ""), updatedAt: new Date() })
      .where(eq(schema.orders.id, id.parse(orderId)));
  });
}

export async function notifyDelayAction(orderId: string, date: string, message: string) {
  const admin = await requireAdmin();
  return guard(async () => {
    const d = new Date(`${date}T12:00:00`);
    if (Number.isNaN(d.getTime()) || d.getTime() < Date.now()) throw new OrderError("Choisis une date à venir.");
    await notifyDelay(id.parse(orderId), d, message.trim().slice(0, 1000), admin.name);
  });
}

export async function saveCustomerMessage(orderId: string, message: string) {
  const admin = await requireAdmin();
  return guard(async () => {
    const oid = id.parse(orderId);
    const text = message.trim().slice(0, 1000) || null;
    await db.update(schema.orders).set({ customerMessage: text, updatedAt: new Date() }).where(eq(schema.orders.id, oid));
    await db.insert(schema.orderEvents).values({ orderId: oid, actor: admin.name, message: text ? `Message au client : « ${text} »` : "Message au client retiré." });
  });
}

export async function extendOrder(orderId: string) {
  const admin = await requireAdmin();
  return guard(() => extendPaymentDelay(id.parse(orderId), 48, admin.name));
}

export async function saveInternalNote(orderId: string, note: string) {
  await requireAdmin();
  await db.update(schema.orders).set({ internalNote: note.slice(0, 2000) || null }).where(eq(schema.orders.id, id.parse(orderId)));
  refresh();
}

/** Renvoie un e-mail déjà envoyé (même contenu, même destinataire). */
export async function resendEmail(emailId: string) {
  await requireAdmin();
  return guard(async () => {
    const [m] = await db.select().from(schema.emails).where(eq(schema.emails.id, id.parse(emailId)));
    if (!m) throw new OrderError("E-mail introuvable.");
    await sendEmail({ to: m.to, subject: m.subject, html: m.html, kind: m.kind, orderId: m.orderId });
  });
}

export async function markRequestHandled(requestId: string) {
  await requireAdmin();
  return guard(async () => {
    await db
      .update(schema.customerRequests)
      .set({ handledAt: new Date() })
      .where(and(eq(schema.customerRequests.id, id.parse(requestId)), isNull(schema.customerRequests.handledAt)));
  });
}

/** Lancée à l'ouverture de l'admin : annule les commandes non payées à temps et remet le stock à jour. */
export async function runExpiry() {
  await requireAdmin();
  const n = await expireUnpaidOrders();
  if (n) {
    expireCatalog();
    refresh();
  }
  return n;
}
