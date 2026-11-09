import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { OrderStatusCode } from "./orders";

/** Onglets de la liste des commandes. */
export const ORDER_TABS = [
  { code: "a-valider", label: "Paiement à valider", statuses: ["pending_payment"] },
  { code: "a-commander", label: "À commander", statuses: ["paid"] },
  { code: "en-cours", label: "En cours", statuses: ["ordered", "received"] },
  { code: "expediees", label: "Expédiées", statuses: ["shipped", "delivered"] },
  { code: "annulees", label: "Annulées", statuses: ["cancelled", "refunded"] },
  { code: "toutes", label: "Toutes", statuses: [] },
] as const satisfies readonly { code: string; label: string; statuses: readonly OrderStatusCode[] }[];

export async function listOrders(tab: string, q: string) {
  const t = ORDER_TABS.find((x) => x.code === tab) ?? ORDER_TABS[0];
  const conds = [];
  if (t.statuses.length) conds.push(inArray(schema.orders.status, [...t.statuses]));
  if (q) {
    const num = Number(q.replace(/\D/g, ""));
    const like = `%${q.replace(/[%_]/g, "")}%`;
    conds.push(
      or(
        num ? eq(schema.orders.number, num) : undefined,
        ilike(schema.orders.email, like),
        ilike(sql`${schema.orders.firstName} || ' ' || ${schema.orders.lastName}`, like),
        ilike(schema.orders.phone, `%${q.replace(/\D/g, "").replace(/^0/, "") || "~"}%`),
      ),
    );
  }
  const orders = await db
    .select()
    .from(schema.orders)
    .where(and(...conds))
    .orderBy(t.code === "a-valider" ? asc(schema.orders.paymentDueAt) : desc(schema.orders.createdAt))
    .limit(200);
  const items = orders.length
    ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, orders.map((o) => o.id)))
    : [];
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

export async function countOrdersByStatus() {
  const rows = await db
    .select({ status: schema.orders.status, n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.orders)
    .groupBy(schema.orders.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<OrderStatusCode, number>>;
}

export async function getOrder(id: string) {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!order) return null;
  const [items, events] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id)),
    db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, id)).orderBy(desc(schema.orderEvents.createdAt)),
  ]);
  return { ...order, items, events };
}
