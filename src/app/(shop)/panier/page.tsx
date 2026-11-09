import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CartQty } from "@/components/cart-line";
import { Totals } from "@/components/order-summary";
import { getCartDetails } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { imageUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <h1 className="text-3xl font-black uppercase tracking-tight">Panier</h1>
      <Suspense fallback={<div className="mt-6 h-48 animate-pulse rounded-2xl bg-black/5" />}>
        <Cart />
      </Suspense>
    </div>
  );
}

async function Cart() {
  const [{ items, subtotal, hasProblems }, settings] = await Promise.all([getCartDetails(), getSettings()]);
  if (!items.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        <p className="text-muted">Ton panier est vide.</p>
        <Link href="/catalogue" className="btn-primary mt-4">Voir le catalogue</Link>
      </div>
    );
  }
  const leadTime = [...new Set(items.map((i) => i.product.leadTime))].join(" / ");
  return (
    <div className="mt-6 space-y-5">
      <ul className="divide-y divide-line rounded-2xl bg-white">
        {items.map(({ line, product: p, maxQty, problem, lineTotal }) => (
          <li key={`${line.p}-${line.s}`} className="flex gap-4 p-4">
            <Link href={`/produit/${p.slug}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-paper">
              {p.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(p.images[0], "sm")} alt="" className="size-full object-cover" />
              )}
            </Link>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">{p.brand}</p>
                  <Link href={`/produit/${p.slug}`} className="font-semibold leading-tight hover:underline">{p.name}</Link>
                  <p className="text-sm text-muted">Pointure {line.s}</p>
                </div>
                <p className="shrink-0 font-semibold">{formatPrice(lineTotal)}</p>
              </div>
              {problem && <p className="text-sm font-medium text-sale">{problem}</p>}
              <CartQty productId={line.p} size={line.s} qty={line.q} max={maxQty} />
            </div>
          </li>
        ))}
      </ul>
      <div className="space-y-4 rounded-2xl bg-white p-5">
        <Totals subtotal={subtotal} shipping={settings.shippingCents} />
        <p className="rounded-xl bg-paper p-3 text-sm text-muted">
          Livraison estimée : <b className="text-ink">{leadTime}</b> après le paiement. Le paiement se règle ensuite sur WhatsApp.
        </p>
        {hasProblems ? (
          <p className="text-sm font-medium text-sale">Modifie ou retire les articles indisponibles pour continuer.</p>
        ) : (
          <Link href="/commande" className="btn-primary w-full py-4 text-base">Commander</Link>
        )}
      </div>
    </div>
  );
}
