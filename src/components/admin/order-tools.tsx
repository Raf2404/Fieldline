"use client";

import { useState, useTransition } from "react";
import { CARRIERS, carrierLabel, trackingUrl } from "@/lib/orders";
import {
  markRequestHandled,
  notifyDelayAction,
  resendEmail,
  saveCustomerMessage,
  shipOrderAction,
  updateTracking,
} from "@/app/admin/(panel)/commandes/actions";

type R = { ok?: boolean; error?: string };

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const run = (fn: () => Promise<R>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setError(r.error ?? null);
      setDone(!r.error);
      if (!r.error) after?.();
    });
  return { pending, error, done, run };
}

/** Expédition : transporteur + numéro de suivi, puis passage en « Expédiée » avec e-mail au client. */
export function ShippingForm({ orderId, mode, carrier, trackingNumber }: { orderId: string; mode: "ship" | "edit"; carrier?: string | null; trackingNumber?: string | null }) {
  const [c, setC] = useState(carrier ?? "colissimo");
  const [n, setN] = useState(trackingNumber ?? "");
  const [editing, setEditing] = useState(mode === "ship");
  const { pending, error, run } = useRun();
  if (!editing) {
    const url = trackingUrl(carrier ?? null, trackingNumber ?? null);
    return (
      <div className="space-y-1 text-sm">
        <p><span className="text-muted">Transporteur :</span> {carrierLabel(carrier ?? null)}</p>
        <p><span className="text-muted">Suivi :</span> {url ? <a href={url} target="_blank" className="underline">{trackingNumber}</a> : trackingNumber}</p>
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium underline">Modifier</button>
      </div>
    );
  }
  return (
    <div className={`space-y-2 ${pending ? "opacity-60" : ""}`}>
      <select value={c} onChange={(e) => setC(e.target.value)} className="input py-2 text-sm" aria-label="Transporteur">
        {Object.entries(CARRIERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <input value={n} onChange={(e) => setN(e.target.value)} placeholder="Numéro de suivi" aria-label="Numéro de suivi" className="input py-2 text-sm" />
      {error && <p className="text-sm text-sale">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => (mode === "ship" ? shipOrderAction(orderId, c, n) : updateTracking(orderId, c, n)), () => setEditing(mode === "ship"))}
        className="btn-primary w-full"
      >
        {mode === "ship" ? "Marquer comme expédiée et prévenir le client" : "Enregistrer le suivi"}
      </button>
    </div>
  );
}

export function CustomerMessage({ orderId, initial }: { orderId: string; initial: string }) {
  const [v, setV] = useState(initial);
  const { pending, error, done, run } = useRun();
  return (
    <section className="space-y-2 rounded-2xl bg-white p-5">
      <h2 className="font-semibold">Message au client</h2>
      <p className="text-xs text-muted">Affiché sur sa page de suivi (ex. « Ta paire est arrivée, expédition demain »).</p>
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={2} className="input text-sm" />
      {error && <p className="text-sm text-sale">{error}</p>}
      <button type="button" disabled={pending || v === initial} onClick={() => run(() => saveCustomerMessage(orderId, v))} className="btn-secondary btn-sm">
        {done && v === initial ? "Publié ✓" : "Publier le message"}
      </button>
    </section>
  );
}

export function DelayNotice({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [msg, setMsg] = useState("");
  const { pending, error, done, run } = useRun();
  if (done) return <p className="text-sm font-medium text-ok">Client prévenu par e-mail ✓</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="w-full rounded-full py-2 text-sm font-medium text-warn hover:bg-warn/10">Prévenir d&apos;un retard</button>;
  return (
    <div className="space-y-2 rounded-xl bg-warn/10 p-3">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Nouvelle date de livraison estimée</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input py-2" />
      </label>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="Message d'excuse (facultatif)" className="input text-sm" />
      {error && <p className="text-sm text-sale">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending || !date} onClick={() => run(() => notifyDelayAction(orderId, date, msg))} className="btn-primary btn-sm">Envoyer au client</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary btn-sm">Annuler</button>
      </div>
    </div>
  );
}

export function ResendEmail({ emailId }: { emailId: string }) {
  const { pending, done, error, run } = useRun();
  return (
    <button type="button" disabled={pending || done} onClick={() => run(() => resendEmail(emailId))} className="text-xs font-medium underline disabled:no-underline disabled:opacity-60">
      {done ? "Renvoyé ✓" : error ? "Échec" : "Renvoyer"}
    </button>
  );
}

export function HandleRequest({ requestId }: { requestId: string }) {
  const { pending, run } = useRun();
  return (
    <button type="button" disabled={pending} onClick={() => run(() => markRequestHandled(requestId))} className="btn-secondary btn-sm">
      Marquer comme traitée
    </button>
  );
}
