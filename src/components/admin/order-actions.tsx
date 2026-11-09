"use client";

import { useState, useTransition } from "react";
import { ORDER_FLOW, ORDER_STATUS, type OrderStatusCode } from "@/lib/orders";
import { extendOrder, saveInternalNote, setOrderStatus } from "@/app/admin/(panel)/commandes/actions";

export function OrderActions({ orderId, status }: { orderId: string; status: OrderStatusCode }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string } | { ok: boolean } | undefined>) =>
    start(async () => {
      const res = await fn();
      setError(res && "error" in res && res.error ? res.error : null);
    });

  const idx = ORDER_FLOW.indexOf(status);
  const next = idx >= 1 && idx < ORDER_FLOW.length - 1 ? ORDER_FLOW[idx + 1] : null;
  const closed = status === "cancelled" || status === "refunded";

  return (
    <section className={`space-y-3 rounded-2xl bg-white p-5 ${pending ? "opacity-60" : ""}`}>
      <h2 className="font-semibold">Actions</h2>
      {status === "pending_payment" && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm("Confirmer que le paiement a bien été reçu ?")) run(() => setOrderStatus(orderId, "paid"));
            }}
            className="btn w-full bg-ok py-3.5 text-white hover:bg-ok/90"
          >
            ✓ Paiement reçu : valider la commande
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => extendOrder(orderId))} className="btn-secondary w-full">
            Prolonger la réservation de 48 h
          </button>
        </>
      )}
      {next && (
        <button type="button" disabled={pending} onClick={() => run(() => setOrderStatus(orderId, next))} className="btn-primary w-full">
          Passer à « {ORDER_STATUS[next].label} »
        </button>
      )}
      {!closed && status !== "delivered" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Annuler cette commande ? Les paires réservées seront remises en stock.")) run(() => setOrderStatus(orderId, "cancelled"));
          }}
          className="w-full rounded-full py-2 text-sm font-medium text-sale hover:bg-sale/10"
        >
          Annuler la commande
        </button>
      )}
      {!closed && status !== "pending_payment" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Marquer comme remboursée ? (le remboursement lui-même se fait de ton côté)")) return;
            const restock = confirm("Remettre les paires en stock ? (OK = oui, Annuler = non)");
            run(() => setOrderStatus(orderId, "refunded", { restock, message: restock ? "Remboursée, paires remises en stock." : "Remboursée." }));
          }}
          className="w-full rounded-full py-2 text-sm font-medium text-muted hover:bg-black/5"
        >
          Marquer comme remboursée
        </button>
      )}
      {closed && <p className="text-sm text-muted">Commande clôturée.</p>}
      {error && <p className="text-sm text-sale">{error}</p>}
      <p className="text-xs text-muted">Les e-mails automatiques à chaque étape arrivent avec la phase 4.</p>
    </section>
  );
}

export function InternalNote({ orderId, initial }: { orderId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section className="space-y-2 rounded-2xl bg-white p-5">
      <h2 className="font-semibold">Notes internes</h2>
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        rows={3}
        placeholder="Référence fournisseur, prix d'achat, moyen de paiement utilisé… (jamais visible par le client)"
        className="input text-sm"
      />
      <button
        type="button"
        disabled={pending || value === initial}
        onClick={() => start(async () => { await saveInternalNote(orderId, value); setSaved(true); })}
        className="btn-secondary btn-sm"
      >
        {saved ? "Enregistré ✓" : "Enregistrer la note"}
      </button>
    </section>
  );
}
