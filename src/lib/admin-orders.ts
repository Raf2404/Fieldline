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
    .limit(t.code === "toutes" ? 1000 : 300);
  const ids = orders.map((o) => o.id);
  const [items, requests] = ids.length
    ? await Promise.all([
        db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids)),
        db.select({ orderId: schema.customerRequests.orderId }).from(schema.customerRequests).where(and(inArray(schema.customerRequests.orderId, ids), sql`${schema.customerRequests.handledAt} is null`)),
      ])
    : [[], []];
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id), openRequests: requests.filter((r) => r.orderId === o.id).length }));
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
  const [items, events, emails, requests] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id)),
    db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, id)).orderBy(desc(schema.orderEvents.createdAt)),
    db
      .select({ id: schema.emails.id, kind: schema.emails.kind, to: schema.emails.to, subject: schema.emails.subject, status: schema.emails.status, error: schema.emails.error, createdAt: schema.emails.createdAt })
      .from(schema.emails)
      .where(eq(schema.emails.orderId, id))
      .orderBy(desc(schema.emails.createdAt)),
    db.select().from(schema.customerRequests).where(eq(schema.customerRequests.orderId, id)).orderBy(desc(schema.customerRequests.createdAt)),
  ]);
  return { ...order, items, events, emails, requests };
}

/** Alertes du tableau de bord : demandes clients non traitées, commandes en retard (plus de 21 jours après paiement). */
export async function getOrderAlerts() {
  const [requests] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.customerRequests)
    .where(sql`${schema.customerRequests.handledAt} is null`);
  const late = await db
    .select({ id: schema.orders.id, number: schema.orders.number, firstName: schema.orders.firstName, lastName: schema.orders.lastName, paidAt: schema.orders.paidAt, status: schema.orders.status })
    .from(schema.orders)
    .where(and(inArray(schema.orders.status, ["paid", "ordered", "received"]), sql`${schema.orders.paidAt} < now() - interval '21 days'`))
    .orderBy(asc(schema.orders.paidAt))
    .limit(20);
  return { openRequests: requests.n, late };
}

const SOLD = ["paid", "ordered", "received", "shipped", "delivered"] as const;

/** Chiffre d'affaires encaissé (date de paiement, heure de Paris), meilleures ventes et pointures sur 90 jours. */
export async function getSalesStats() {
  const tz = sql.raw("'Europe/Paris'");
  const sum = (unit: "day" | "week" | "month") =>
    sql<number>`coalesce(sum(${schema.orders.totalCents}) filter (where ${schema.orders.paidAt} >= date_trunc('${sql.raw(unit)}', now() at time zone ${tz}) at time zone ${tz}), 0)`.mapWith(Number);
  const cnt = (unit: "day" | "week" | "month") =>
    sql<number>`count(*) filter (where ${schema.orders.paidAt} >= date_trunc('${sql.raw(unit)}', now() at time zone ${tz}) at time zone ${tz})`.mapWith(Number);
  const [rev] = await db
    .select({ day: sum("day"), week: sum("week"), month: sum("month"), dayN: cnt("day"), weekN: cnt("week"), monthN: cnt("month") })
    .from(schema.orders)
    .where(inArray(schema.orders.status, [...SOLD]));
  const since = sql`${schema.orders.paidAt} > now() - interval '90 days'`;
  const qty = sql<number>`sum(${schema.orderItems.quantity})`.mapWith(Number);
  const [best, sizes] = await Promise.all([
    db
      .select({ name: sql<string>`${schema.orderItems.brand} || ' ' || ${schema.orderItems.productName}`, qty })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
      .where(and(inArray(schema.orders.status, [...SOLD]), since))
      .groupBy(schema.orderItems.brand, schema.orderItems.productName)
      .orderBy(desc(qty))
      .limit(5),
    db
      .select({ size: schema.orderItems.size, qty })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
      .where(and(inArray(schema.orders.status, [...SOLD]), since))
      .groupBy(schema.orderItems.size)
      .orderBy(desc(qty))
      .limit(6),
  ]);
  return { revenue: rev, best, sizes };
}

/** Clients = toutes les adresses e-mail ayant commandé, avec ou sans compte. */
export async function listCustomers(q: string) {
  const spent = sql<number>`coalesce(sum(${schema.orders.totalCents}) filter (where ${schema.orders.status} in ('paid','ordered','received','shipped','delivered')), 0)`.mapWith(Number);
  const count = sql<number>`count(*) filter (where ${schema.orders.status} not in ('cancelled'))`.mapWith(Number);
  const last = sql<Date>`max(${schema.orders.createdAt})`;
  const like = `%${q.replace(/[%_]/g, "")}%`;
  return db
    .select({
      email: schema.orders.email,
      name: sql<string>`(array_agg(${schema.orders.firstName} || ' ' || ${schema.orders.lastName} order by ${schema.orders.createdAt} desc))[1]`,
      phone: sql<string>`(array_agg(${schema.orders.phone} order by ${schema.orders.createdAt} desc))[1]`,
      orders: count,
      spent,
      last,
      hasAccount: sql<boolean>`exists(select 1 from ${schema.customers} c where c.email = ${schema.orders.email})`,
    })
    .from(schema.orders)
    .where(q ? or(ilike(schema.orders.email, like), ilike(sql`${schema.orders.firstName} || ' ' || ${schema.orders.lastName}`, like)) : undefined)
    .groupBy(schema.orders.email)
    .orderBy(desc(spent), desc(last))
    .limit(500);
}

export async function getCustomerFile(email: string) {
  const orders = await db.select().from(schema.orders).where(eq(schema.orders.email, email)).orderBy(desc(schema.orders.createdAt));
  if (!orders.length) return null;
  const ids = orders.map((o) => o.id);
  const [items, requests, [account]] = await Promise.all([
    db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids)),
    db.select().from(schema.customerRequests).where(inArray(schema.customerRequests.orderId, ids)).orderBy(desc(schema.customerRequests.createdAt)),
    db.select().from(schema.customers).where(eq(schema.customers.email, email)),
  ]);
  return { orders, items, requests, account: account ?? null };
}
