import { formatPrice } from "@/lib/money";

export function Totals({ subtotal, shipping }: { subtotal: number; shipping: number }) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd>{formatPrice(subtotal)}</dd></div>
      <div className="flex justify-between"><dt className="text-muted">Livraison</dt><dd>{shipping ? formatPrice(shipping) : "Offerte"}</dd></div>
      <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{formatPrice(subtotal + shipping)}</dd></div>
    </dl>
  );
}
