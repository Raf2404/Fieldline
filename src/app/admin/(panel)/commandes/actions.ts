"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { OrderError, changeOrderStatus, expireUnpaidOrders, extendPaymentDelay } from "@/lib/order-service";
import { ORDER_STATUS, type OrderStatusCode } from "@/lib/orders";
import { expireCatalog } from "@/lib/revalidate";

const id = z.uuid();
const statuses = Object.keys(ORDER_STATUS) as [OrderStatusCode, ...OrderStatusCode[]];

export async function setOrderStatus(orderId: string, status: OrderStatusCode, opts: { restock?: boolean; message?: string } = {}) {
  const admin = await requireAdmin();
  const s = z.enum(statuses).parse(status);
  try {
    const { stockChanged } = await changeOrderStatus(id.parse(orderId), s, admin.name, {
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
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    throw e;
  }
}

export async function extendOrder(orderId: string) {
  const admin = await requireAdmin();
  try {
    await extendPaymentDelay(id.parse(orderId), 48, admin.name);
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    throw e;
  }
}

export async function saveInternalNote(orderId: string, note: string) {
  await requireAdmin();
  await db.update(schema.orders).set({ internalNote: note.slice(0, 2000) || null }).where(eq(schema.orders.id, id.parse(orderId)));
  refresh();
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
