"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, useTransition } from "react";
import { availabilityLabel, canReserve, sizeAvailability } from "@/lib/catalog";
import { notifyBackInStock } from "@/app/(shop)/produit/actions";
import { addToCart } from "@/app/(shop)/panier/actions";

type Props = {
  productId: string;
  status: string;
  allowBackorder: boolean;
  sizes: { size: string; stock: number }[];
  leadTime: string;
};

export function SizePicker({ productId, status, allowBackorder, sizes, leadTime }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();
  const p = { status, allowBackorder };
  const sel = selected ? sizes.find((s) => s.size === selected) : null;
  const selAvail = sel ? sizeAvailability(p, sel.stock) : null;
  const anyReservable = status !== "coming_soon" && sizes.some((s) => canReserve(sizeAvailability(p, s.stock)));

  return (
    <div className="space-y-5">
      {sizes.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">
              Pointure (EU){selected && <span className="font-normal text-muted"> · {selected}</span>}
            </span>
            <Link href="/guide-des-tailles" className="text-muted underline underline-offset-4 hover:text-ink">
              Guide des tailles
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {sizes.map((s) => {
              const a = sizeAvailability(p, s.stock);
              const ok = canReserve(a);
              return (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => {
                    setSelected(s.size);
                    setNotice(null);
                  }}
                  aria-pressed={selected === s.size}
                  className={`relative rounded-xl border py-3 text-sm font-semibold transition ${
                    selected === s.size
                      ? "border-ink bg-ink text-white"
                      : ok
                        ? "border-line bg-white hover:border-ink"
                        : "border-line bg-black/[0.03] text-muted line-through decoration-1"
                  }`}
                >
                  {s.size}
                  {a.kind === "low" && selected !== s.size && (
                    <span className="absolute -top-1.5 right-1 rounded-full bg-warn px-1 text-[10px] font-bold text-white no-underline">
                      {a.left}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selAvail && (
            <p className={`mt-2 text-sm font-medium ${canReserve(selAvail) ? (selAvail.kind === "available" ? "text-ok" : "text-warn") : "text-muted"}`}>
              {availabilityLabel(selAvail)}
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-4 text-sm">
        <p className="font-semibold">Livraison estimée : {leadTime} après ta commande</p>
        <p className="mt-1 text-muted">Tu es prévenu par e-mail à chaque étape et tu peux suivre ta commande en ligne.</p>
      </div>

      {sel && selAvail && !canReserve(selAvail) ? (
        <BackInStockForm productId={productId} size={sel.size} />
      ) : status === "coming_soon" || !anyReservable ? (
        <BackInStockForm productId={productId} size={null} />
      ) : (
        <>
          <button
            type="button"
            disabled={!selAvail || !canReserve(selAvail) || adding}
            onClick={() =>
              startAdding(async () => {
                const res = await addToCart(productId, selected!);
                if (res?.error) setNotice(res.error);
              })
            }
            className="btn-primary w-full py-4 text-base"
          >
            {adding ? "Ajout…" : selected ? "Réserver ma paire" : "Choisis ta pointure"}
          </button>
          {notice && <p className="rounded-xl bg-sale/10 p-3 text-sm text-sale">{notice}</p>}
        </>
      )}
    </div>
  );
}

function BackInStockForm({ productId, size }: { productId: string; size: string | null }) {
  const [state, action, pending] = useActionState(notifyBackInStock, null);
  if (state?.ok) {
    return <p className="rounded-xl bg-accent/40 p-4 text-sm font-medium">C&apos;est noté ! On t&apos;écrit dès que {size ? `le ${size} est` : "l'article est"} disponible.</p>;
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-2"
    >
      <input type="hidden" name="productId" value={productId} />
      {size && <input type="hidden" name="size" value={size} />}
      <p className="text-sm font-semibold">Me prévenir du retour{size ? ` en ${size}` : " en stock"}</p>
      <div className="flex gap-2">
        <input type="email" name="email" required placeholder="ton@email.fr" autoComplete="email" className="input" />
        <button className="btn-primary shrink-0" disabled={pending}>
          M&apos;alerter
        </button>
      </div>
      {state?.error && <p className="text-sm text-sale">{state.error}</p>}
    </form>
  );
}
