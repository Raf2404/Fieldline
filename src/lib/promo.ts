import "server-only";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PromoCode } from "@/db/schema";
import { formatPrice } from "./money";

export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");

/** Utilisations = commandes passées avec ce code, hors annulées et remboursées (une annulation rend l'utilisation). */
export async function promoUses(code: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.orders)
    .where(and(eq(schema.orders.promoCode, code), notInArray(schema.orders.status, ["cancelled", "refunded"])));
  return n;
}

export function discountFor(promo: PromoCode, subtotal: number) {
  const d = promo.type === "percent" ? Math.round((subtotal * promo.value) / 100) : promo.value;
  return Math.max(0, Math.min(d, subtotal));
}

export const promoLabel = (p: Pick<PromoCode, "type" | "value">) => (p.type === "percent" ? `-${p.value} %` : `-${formatPrice(p.value)}`);

/** Vérifie un code pour un sous-total donné. */
export async function checkPromo(raw: string, subtotal: number): Promise<{ promo: PromoCode; discount: number } | { error: string }> {
  const code = normalizeCode(raw);
  if (!code) return { error: "Indique un code." };
  const [promo] = await db.select().from(schema.promoCodes).where(eq(schema.promoCodes.code, code));
  if (!promo || !promo.active) return { error: "Ce code n'existe pas." };
  if (promo.endsAt && promo.endsAt.getTime() < Date.now()) return { error: "Ce code a expiré." };
  if (promo.minSubtotalCents && subtotal < promo.minSubtotalCents)
    return { error: `Ce code s'applique dès ${formatPrice(promo.minSubtotalCents)} d'achat.` };
  if (promo.maxUses != null && (await promoUses(code)) >= promo.maxUses) return { error: "Ce code a atteint son nombre d'utilisations." };
  return { promo, discount: discountFor(promo, subtotal) };
}
