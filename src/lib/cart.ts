import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { canReserve, sizeAvailability } from "./catalog";
import { MAX_QTY_PER_LINE } from "./orders";
import { checkPromo } from "./promo";
import { getPublicCatalog, type PublicProduct } from "./queries";

// Panier gardé dans un cookie : rendu côté serveur avec les prix et stocks à jour, sans compte.
const COOKIE = "panier";
const PROMO_COOKIE = "code_promo";
const line = z.object({ p: z.uuid(), s: z.string().max(10), q: z.number().int().min(1).max(MAX_QTY_PER_LINE) });
const cartSchema = z.array(line).max(20);
export type CartLine = z.infer<typeof line>;

export async function readCart(): Promise<CartLine[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function writeCart(lines: CartLine[]) {
  const store = await cookies();
  if (!lines.length) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, JSON.stringify(lines.slice(0, 20)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function readPromoCode() {
  return (await cookies()).get(PROMO_COOKIE)?.value ?? "";
}

export async function writePromoCode(code: string) {
  const store = await cookies();
  if (!code) store.delete(PROMO_COOKIE);
  else store.set(PROMO_COOKIE, code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export type CartItem = {
  line: CartLine;
  product: PublicProduct;
  /** Paires disponibles pour cette pointure (Infinity si vente sur commande). */
  maxQty: number;
  problem: string | null;
  lineTotal: number;
};

/** Panier enrichi avec le catalogue à jour ; signale ce qui n'est plus disponible. */
export async function getCartDetails() {
  const [lines, catalog] = await Promise.all([readCart(), getPublicCatalog()]);
  const items: CartItem[] = [];
  for (const l of lines) {
    const product = catalog.find((p) => p.id === l.p);
    if (!product) continue; // article retiré du site
    const size = product.sizes.find((s) => s.size === l.s);
    const avail = size ? sizeAvailability(product, size.stock) : null;
    const ok = product.status === "online" && avail && canReserve(avail);
    const maxQty = product.allowBackorder ? MAX_QTY_PER_LINE : Math.min(size?.stock ?? 0, MAX_QTY_PER_LINE);
    let problem: string | null = null;
    if (!ok) problem = "Cette pointure n'est plus disponible.";
    else if (l.q > maxQty) problem = maxQty === 1 ? "Plus qu'une paire disponible." : `Plus que ${maxQty} paires disponibles.`;
    items.push({ line: l, product, maxQty, problem, lineTotal: product.priceCents * l.q });
  }
  const subtotal = items.filter((i) => !i.problem).reduce((n, i) => n + i.lineTotal, 0);
  const count = lines.reduce((n, l) => n + l.q, 0);
  const code = await readPromoCode();
  let promo: { code: string; discount: number; error: string | null } | null = null;
  if (code && subtotal > 0) {
    const r = await checkPromo(code, subtotal);
    promo = "error" in r ? { code, discount: 0, error: r.error } : { code: r.promo.code, discount: r.discount, error: null };
  }
  return { items, subtotal, count, hasProblems: items.some((i) => i.problem), promo, discount: promo?.discount ?? 0 };
}
