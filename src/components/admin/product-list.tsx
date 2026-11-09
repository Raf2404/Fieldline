"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { STATUS_LABELS, availabilityLabel, type Status } from "@/lib/catalog";
import { centsToInput, formatPrice } from "@/lib/money";
import type { AdminProductRow } from "@/lib/admin-data";
import {
  deleteProduct,
  duplicateProduct,
  reorderProducts,
  restoreProduct,
  setProductStatus,
  updateProductPrice,
  updateStocks,
} from "@/app/admin/(panel)/articles/actions";
import { GripIcon } from "../icons";
import { useSortable } from "./use-sortable";

type Row = AdminProductRow & { thumb: string | null };

const STATUS_TONE: Record<string, string> = {
  online: "bg-ok/10 text-ok",
  out_of_stock: "bg-sale/10 text-sale",
  coming_soon: "bg-ink/10 text-ink",
  draft: "bg-black/5 text-muted",
  deleted: "bg-black/5 text-muted",
};

export function ProductList({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();
  const { handleProps, itemRef, dragging } = useSortable(rows, setRows, (next) =>
    start(() => reorderProducts(next.map((r) => r.id))),
  );

  return (
    <ul className={`space-y-2 ${pending ? "opacity-70" : ""}`}>
      {rows.map((r, i) => (
        <li
          key={r.id}
          ref={itemRef(i)}
          className={`rounded-2xl bg-white p-3 transition-shadow ${dragging === i ? "shadow-xl ring-2 ring-ink" : ""}`}
        >
          <ProductRow row={r} handle={r.status === "deleted" ? null : handleProps(i)} />
        </li>
      ))}
    </ul>
  );
}

function ProductRow({ row: r, handle }: { row: Row; handle: ReturnType<ReturnType<typeof useSortable>["handleProps"]> | null }) {
  const [pending, start] = useTransition();
  const [stockOpen, setStockOpen] = useState(false);
  const [price, setPrice] = useState(centsToInput(r.priceCents));
  const [priceError, setPriceError] = useState(false);
  const autoOut = r.status === "online" && r.availability.kind === "out";

  const savePrice = () => {
    if (price === centsToInput(r.priceCents)) return;
    start(async () => {
      const res = await updateProductPrice(r.id, price);
      setPriceError(Boolean(res?.error));
    });
  };

  return (
    <div className={pending ? "opacity-60" : ""}>
      <div className="flex items-center gap-3">
        {handle && (
          <button type="button" aria-label="Déplacer" className="-ml-1 rounded p-1 text-muted hover:bg-black/5" {...handle}>
            <GripIcon className="size-5" />
          </button>
        )}
        <Link href={`/admin/articles/${r.id}`} className="size-14 shrink-0 overflow-hidden rounded-xl bg-paper">
          {r.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.thumb} alt="" className="size-full object-cover" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/admin/articles/${r.id}`} className="block truncate font-semibold hover:underline">
            {r.name}
          </Link>
          <p className="text-xs text-muted">
            {r.brand} · {formatPrice(r.priceCents)} ·{" "}
            <button type="button" onClick={() => setStockOpen((o) => !o)} className="underline underline-offset-2 hover:text-ink">
              {r.totalStock} en stock
            </button>
            {autoOut && <span className="ml-1 text-sale">· {availabilityLabel(r.availability)} (auto)</span>}
          </p>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <span className="text-xs text-muted">Prix</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={savePrice}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
            inputMode="decimal"
            aria-label="Prix de vente"
            className={`input w-20 py-1.5 text-right text-sm ${priceError ? "border-sale" : ""}`}
          />
          <span className="text-sm">€</span>
        </div>
        {r.status === "deleted" ? (
          <button type="button" className="btn-secondary btn-sm" onClick={() => start(() => restoreProduct(r.id))}>
            Restaurer
          </button>
        ) : (
          <select
            value={r.status}
            onChange={(e) => start(() => setProductStatus(r.id, e.target.value as Status))}
            aria-label="Statut"
            className={`max-w-36 rounded-full border-0 py-1.5 pl-3 pr-7 text-xs font-semibold ${STATUS_TONE[r.status]}`}
          >
            {(Object.keys(STATUS_LABELS) as Status[])
              .filter((s) => s !== "deleted")
              .map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
          </select>
        )}
      </div>

      {r.status !== "deleted" && (
        <div className="mt-2 flex flex-wrap items-center gap-1 pl-0 text-xs sm:pl-[5.25rem]">
          <Link href={`/admin/articles/${r.id}`} className="rounded-full px-2.5 py-1 font-medium hover:bg-black/5">Modifier</Link>
          <button type="button" onClick={() => setStockOpen((o) => !o)} className="rounded-full px-2.5 py-1 font-medium hover:bg-black/5">Stock</button>
          <button type="button" onClick={() => start(() => duplicateProduct(r.id))} className="rounded-full px-2.5 py-1 font-medium hover:bg-black/5">Dupliquer</button>
          {r.status !== "draft" && (
            <a href={`/produit/${r.slug}`} target="_blank" className="rounded-full px-2.5 py-1 font-medium hover:bg-black/5">Voir ↗</a>
          )}
          <button
            type="button"
            onClick={() => {
              if (confirm(`Supprimer « ${r.name} » ? Il disparaîtra du site, les anciennes commandes restent intactes.`))
                start(() => deleteProduct(r.id));
            }}
            className="ml-auto rounded-full px-2.5 py-1 font-medium text-sale hover:bg-sale/10"
          >
            Supprimer
          </button>
        </div>
      )}

      {stockOpen && <StockEditor row={r} onDone={() => setStockOpen(false)} />}
    </div>
  );
}

function StockEditor({ row, onDone }: { row: Row; onDone: () => void }) {
  const [sizes, setSizes] = useState(row.sizes);
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 rounded-xl bg-paper p-3">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {sizes.map((s, i) => (
          <label key={s.size} className="text-center text-xs">
            <span className="mb-1 block font-semibold">{s.size}</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={s.stock}
              onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, stock: Number(e.target.value) } : x)))}
              className="input px-1 py-1.5 text-center text-sm"
            />
          </label>
        ))}
      </div>
      {!sizes.length && <p className="text-sm text-muted">Aucune pointure : ajoute-les depuis la fiche article.</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await updateStocks(row.id, sizes); onDone(); })}
          className="btn-primary btn-sm"
        >
          Enregistrer le stock
        </button>
        <button type="button" onClick={onDone} className="btn-secondary btn-sm">Annuler</button>
      </div>
    </div>
  );
}
