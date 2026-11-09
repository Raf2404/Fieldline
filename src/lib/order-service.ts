import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { compareSizes } from "./catalog";
import { MAX_PENDING_PER_CUSTOMER, MAX_QTY_PER_LINE, type OrderStatusCode } from "./orders";
import { getSettings } from "./settings";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class OrderError extends Error {}

export type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string | null;
  postalCode: string;
  city: string;
  customerNote: string | null;
};

/**
 * Crée une commande « En attente de paiement » et réserve les paires.
 * Prix et stock sont relus en base : rien ne vient du navigateur à part les pointures et quantités.
 */
export async function createOrder(lines: { p: string; s: string; q: number }[], customer: Customer) {
  if (!lines.length) throw new OrderError("Ton panier est vide.");
  const settings = await getSettings();

  const pending = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.status, "pending_payment"),
        or(eq(schema.orders.email, customer.email), eq(schema.orders.phone, customer.phone)),
      ),
    );
  if (pending[0].n >= MAX_PENDING_PER_CUSTOMER) {
    throw new OrderError(
      "Tu as déjà des commandes en attente de paiement. Règle-les ou contacte-nous avant d'en passer une nouvelle.",
    );
  }

  const token = randomBytes(18).toString("base64url");
  return db.transaction(async (tx) => {
    const ids = [...new Set(lines.map((l) => l.p))];
    const products = await tx
      .select({ p: schema.products, brand: schema.brands.name })
      .from(schema.products)
      .innerJoin(schema.brands, eq(schema.brands.id, schema.products.brandId))
      .where(inArray(schema.products.id, ids));
    const images = await tx
      .selectDistinctOn([schema.productImages.productId], { productId: schema.productImages.productId, key: schema.productImages.key })
      .from(schema.productImages)
      .where(inArray(schema.productImages.productId, ids))
      .orderBy(schema.productImages.productId, schema.productImages.position);

    const items: (typeof schema.orderItems.$inferInsert)[] = [];
    for (const l of lines) {
      const row = products.find((x) => x.p.id === l.p);
      const label = row ? `${row.p.name} en ${l.s}` : "Un article";
      if (!row || row.p.status !== "online") throw new OrderError(`${label} n'est plus disponible.`);
      const qty = Math.min(Math.max(1, Math.floor(l.q)), MAX_QTY_PER_LINE);
      // Verrouille la ligne de stock : deux clients ne peuvent pas prendre la même dernière paire.
      const [size] = await tx
        .select()
        .from(schema.productSizes)
        .where(and(eq(schema.productSizes.productId, l.p), eq(schema.productSizes.size, l.s)))
        .for("update");
      if (!size) throw new OrderError(`${label} n'est plus disponible.`);
      const inStock = Math.max(0, size.stock);
      if (inStock < qty && !row.p.allowBackorder) {
        throw new OrderError(
          inStock === 0 ? `${label} vient d'être épuisé.` : `Il ne reste que ${inStock} paire(s) de ${label}.`,
        );
      }
      const reserved = Math.min(inStock, qty);
      if (reserved > 0) {
        await tx.update(schema.productSizes).set({ stock: sql`${schema.productSizes.stock} - ${reserved}` }).where(eq(schema.productSizes.id, size.id));
      }
      items.push({
        orderId: "",
        productId: row.p.id,
        productName: row.p.name,
        brand: row.brand,
        imageKey: images.find((i) => i.productId === row.p.id)?.key ?? null,
        size: l.s,
        quantity: qty,
        unitPriceCents: row.p.priceCents,
        reservedQty: reserved,
      });
    }

    const subtotal = items.reduce((n, i) => n + i.unitPriceCents * i.quantity, 0);
    const shipping = settings.shippingCents;
    const [order] = await tx
      .insert(schema.orders)
      .values({
        ...customer,
        token,
        status: "pending_payment",
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: subtotal + shipping,
        paymentDueAt: new Date(Date.now() + settings.paymentDelayHours * 3_600_000),
      })
      .returning();
    await tx.insert(schema.orderItems).values(
      items.sort((a, b) => compareSizes(a.size, b.size)).map((i) => ({ ...i, orderId: order.id })),
    );
    await tx.insert(schema.orderEvents).values({
      orderId: order.id,
      status: "pending_payment",
      message: "Commande passée sur le site, en attente du paiement via WhatsApp.",
      actor: "client",
    });
    return order;
  });
}

/** Remet en stock les paires réservées par une commande (une seule fois). */
async function releaseStock(tx: Tx, orderId: string) {
  const [o] = await tx.select({ released: schema.orders.stockReleased }).from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
  if (!o || o.released) return;
  const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  for (const i of items) {
    if (!i.productId || i.reservedQty <= 0) continue;
    await tx
      .update(schema.productSizes)
      .set({ stock: sql`${schema.productSizes.stock} + ${i.reservedQty}` })
      .where(and(eq(schema.productSizes.productId, i.productId), eq(schema.productSizes.size, i.size)));
  }
  await tx.update(schema.orders).set({ stockReleased: true }).where(eq(schema.orders.id, orderId));
}

export async function changeOrderStatus(
  orderId: string,
  status: OrderStatusCode,
  actor: string,
  opts: { message?: string; restock?: boolean } = {},
) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!o) throw new OrderError("Commande introuvable.");
    if (o.status === status) return { order: o, stockChanged: false };
    const restock = status === "cancelled" || (status === "refunded" && opts.restock);
    if (restock) await releaseStock(tx, orderId);
    const [updated] = await tx
      .update(schema.orders)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === "paid" && !o.paidAt ? { paidAt: new Date() } : {}),
        ...(status !== "pending_payment" ? { paymentDueAt: null } : {}),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();
    await tx.insert(schema.orderEvents).values({
      orderId,
      status,
      actor,
      message: opts.message ?? (restock ? "Statut modifié, paires remises en stock." : "Statut modifié."),
    });
    return { order: updated, stockChanged: Boolean(restock) };
  });
}

/** Annule les commandes non payées dans le délai et libère leur stock. Renvoie le nombre annulé. */
export async function expireUnpaidOrders() {
  const stale = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(and(eq(schema.orders.status, "pending_payment"), lt(schema.orders.paymentDueAt, new Date())));
  for (const o of stale) {
    await changeOrderStatus(o.id, "cancelled", "système", {
      message: "Annulée automatiquement : paiement non reçu dans le délai. Paires remises en stock.",
    });
  }
  return stale.length;
}

export async function extendPaymentDelay(orderId: string, hours: number, actor: string) {
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!o || o.status !== "pending_payment") throw new OrderError("Seule une commande en attente de paiement peut être prolongée.");
    const base = Math.max(Date.now(), o.paymentDueAt?.getTime() ?? 0);
    await tx.update(schema.orders).set({ paymentDueAt: new Date(base + hours * 3_600_000), updatedAt: new Date() }).where(eq(schema.orders.id, orderId));
    await tx.insert(schema.orderEvents).values({ orderId, actor, message: `Délai de paiement prolongé de ${hours} h.` });
  });
}

export async function getOrderByToken(token: string) {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.token, token));
  if (!order) return null;
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  return { ...order, items };
}
