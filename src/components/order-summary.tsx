import { formatPrice } from "@/lib/money";

export function Totals({ subtotal, shipping, discount = 0, code }: { subtotal: number; shipping: number; discount?: number; code?: string | null }) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd>{formatPrice(subtotal)}</dd></div>
      {discount > 0 && (
        <div className="flex justify-between text-ok"><dt>Code {code}</dt><dd>-{formatPrice(discount)}</dd></div>
      )}
      <div className="flex justify-between"><dt className="text-muted">Livraison</dt><dd>{shipping ? formatPrice(shipping) : "Offerte"}</dd></div>
      <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{formatPrice(subtotal - discount + shipping)}</dd></div>
    </dl>
  );
}
