"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { bulkAdvance } from "@/app/admin/(panel)/commandes/actions";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS, dateFr, orderRef, timeLeft, type OrderStatusCode } from "@/lib/orders";

export type OrderRow = {
  id: string;
  number: number;
  status: OrderStatusCode;
  firstName: string;
  lastName: string;
  totalCents: number;
  createdAt: string;
  paidAt: string | null;
  paymentDueAt: string | null;
  summary: string;
  openRequests: number;
};

const BULK = [
  { status: "ordered", from: "paid", label: "Commandées au fournisseur" },
  { status: "received", from: "ordered", label: "Reçues, en préparation" },
  { status: "delivered", from: "shipped", label: "Livrées" },
] as const;

export function OrderList({ orders, now }: { orders: OrderRow[]; now: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const sel = orders.filter((o) => selected.includes(o.id));
  const nowMs = new Date(now).getTime();

  return (
    <div className="space-y-2">
      {orders.length > 1 && (
        <label className="flex items-center gap-2 px-1 text-sm text-muted">
          <input type="checkbox" className="size-4 accent-ink" checked={selected.length === orders.length} onChange={(e) => setSelected(e.target.checked ? orders.map((o) => o.id) : [])} />
          Tout sélectionner
        </label>
      )}
      {result && <p role="status" className="rounded-xl bg-ok/10 p-3 text-sm font-medium text-ok">{result}</p>}
      {!orders.length && <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-muted">Aucune commande ici.</div>}
      <ul className="space-y-2">
        {orders.map((o) => {
          const days = Math.floor((nowMs - new Date(o.createdAt).getTime()) / 86_400_000);
          return (
            <li key={o.id} className={`flex gap-3 rounded-2xl bg-white p-4 ${selected.includes(o.id) ? "ring-2 ring-brand" : ""}`}>
              <input type="checkbox" aria-label={`Sélectionner ${orderRef(o.number)}`} checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="mt-1 size-4 shrink-0 accent-ink" />
              <Link href={`/admin/commandes/${o.id}`} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold">{orderRef(o.number)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span>
                  {o.status === "pending_payment" && o.paymentDueAt && (
                    <span className={`text-xs font-medium ${new Date(o.paymentDueAt).getTime() - nowMs < 6 * 3_600_000 ? "text-sale" : "text-muted"}`}>⏱ {timeLeft(o.paymentDueAt, new Date(now))}</span>
                  )}
                  {!["pending_payment", "delivered", "cancelled", "refunded"].includes(o.status) && (
                    <span className={`text-xs font-medium ${days > 21 ? "text-sale" : "text-muted"}`}>J+{days}</span>
                  )}
                  {o.openRequests > 0 && <span className="rounded-full bg-sale/10 px-2 py-0.5 text-xs font-semibold text-sale">Demande client</span>}
                  <span className="ml-auto font-semibold">{formatPrice(o.totalCents)}</span>
                </div>
                <p className="mt-1 text-sm">{o.firstName} {o.lastName} <span className="text-muted">· {dateFr(o.createdAt)}</span></p>
                <p className="mt-0.5 truncate text-sm text-muted">{o.summary}</p>
              </Link>
            </li>
          );
        })}
      </ul>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-12 z-40 border-t border-line bg-white p-3 shadow-2xl lg:bottom-0">
          <div className={`mx-auto flex max-w-6xl flex-wrap items-center gap-2 ${pending ? "opacity-60" : ""}`}>
            <span className="mr-2 text-sm font-semibold">{selected.length} sélectionnée{selected.length > 1 ? "s" : ""}</span>
            {BULK.map((b) => {
              const n = sel.filter((o) => o.status === b.from).length;
              return (
                <button
                  key={b.status}
                  type="button"
                  disabled={!n || pending}
                  onClick={() =>
                    start(async () => {
                      const r = await bulkAdvance(selected, b.status);
                      setResult(`${r.done} commande${r.done > 1 ? "s" : ""} passée${r.done > 1 ? "s" : ""} en « ${b.label} », client${r.done > 1 ? "s" : ""} prévenu${r.done > 1 ? "s" : ""}.`);
                      setSelected([]);
                    })
                  }
                  className="btn-primary btn-sm"
                >
                  → {b.label}{n ? ` (${n})` : ""}
                </button>
              );
            })}
            <button type="button" onClick={() => setSelected([])} className="btn-secondary btn-sm ml-auto">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
