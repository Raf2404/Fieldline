import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { Totals } from "@/components/order-summary";
import { getCartDetails } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <Link href="/panier" className="text-sm text-muted hover:text-ink">← Panier</Link>
      <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight">Commande</h1>
      <div className="mt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-black/5" />}>
          <Checkout />
        </Suspense>
      </div>
    </div>
  );
}

async function Checkout() {
  const [{ items, subtotal, hasProblems }, settings] = await Promise.all([getCartDetails(), getSettings()]);
  if (!items.length || hasProblems) redirect("/panier");
  const leadTime = [...new Set(items.map((i) => i.product.leadTime))].join(" / ");
  return (
    <CheckoutForm
      summary={
        <div className="space-y-4 rounded-2xl bg-white p-5">
          <h2 className="font-semibold">Récapitulatif</h2>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={`${i.line.p}-${i.line.s}`} className="flex justify-between gap-3">
                <span>
                  {i.product.brand} {i.product.name}
                  <span className="text-muted"> · {i.line.s}{i.line.q > 1 ? ` · ×${i.line.q}` : ""}</span>
                </span>
                <span className="shrink-0">{formatPrice(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <Totals subtotal={subtotal} shipping={settings.shippingCents} />
          <p className="rounded-xl bg-accent/30 p-3 text-sm">
            <b>Livraison estimée : {leadTime}</b> après réception de ton paiement.
          </p>
        </div>
      }
    />
  );
}
