"use client";

import { useTransition } from "react";
import { updateCartLine } from "@/app/(shop)/panier/actions";

export function CartQty({ productId, size, qty, max }: { productId: string; size: string; qty: number; max: number }) {
  const [pending, start] = useTransition();
  const options = Array.from({ length: Math.max(max, qty) }, (_, i) => i + 1);
  return (
    <div className={`flex items-center gap-3 ${pending ? "opacity-50" : ""}`}>
      <select
        value={qty}
        disabled={pending}
        aria-label="Quantité"
        onChange={(e) => start(() => updateCartLine(productId, size, Number(e.target.value)))}
        className="input w-auto py-1.5 text-sm"
      >
        {options.map((n) => (
          <option key={n} value={n}>Qté {n}</option>
        ))}
      </select>
      <button type="button" disabled={pending} onClick={() => start(() => updateCartLine(productId, size, 0))} className="text-sm text-muted underline hover:text-sale">
        Retirer
      </button>
    </div>
  );
}
