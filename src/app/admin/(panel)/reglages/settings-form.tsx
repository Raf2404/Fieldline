"use client";

import { startTransition, useActionState } from "react";
import type { ShopSettings } from "@/lib/settings";
import { centsToInput } from "@/lib/money";
import { formatPhone } from "@/lib/orders";
import { saveShopSettings, type SettingsState } from "./actions";

export function SettingsForm({ settings }: { settings: ShopSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveShopSettings, null);
  const e = state?.errors ?? {};
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
      className="max-w-2xl space-y-4"
    >
      <section className="space-y-4 rounded-2xl bg-white p-5">
        <h2 className="font-semibold">Paiement via WhatsApp</h2>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Numéro WhatsApp de la boutique</span>
          <input name="whatsapp" type="tel" defaultValue={settings.whatsapp ? formatPhone(settings.whatsapp) : ""} placeholder="06 12 34 56 78" className="input" />
          {e.whatsapp ? <span className="text-sm text-sale">{e.whatsapp}</span> : <span className="block text-xs text-muted">Le bouton « Envoyer ma commande sur WhatsApp » apparaît après chaque commande. Tant que ce champ est vide, le client est renvoyé vers la page contact.</span>}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Infos de paiement affichées après la commande <span className="font-normal text-muted">(facultatif)</span></span>
          <textarea name="paymentInfo" rows={3} defaultValue={settings.paymentInfo} placeholder="Ex. : Paiement accepté par virement ou Wero. Les instructions te sont envoyées sur WhatsApp." className="input" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Durée de réservation sans paiement (heures)</span>
          <input name="paymentDelayHours" type="number" min={1} max={336} defaultValue={settings.paymentDelayHours} className="input w-32" />
          {e.paymentDelayHours ? <span className="text-sm text-sale">{e.paymentDelayHours}</span> : <span className="block text-xs text-muted">Passé ce délai, la commande est annulée et les paires reviennent en stock.</span>}
        </label>
      </section>
      <section className="space-y-4 rounded-2xl bg-white p-5">
        <h2 className="font-semibold">Livraison</h2>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Frais de port par commande (€)</span>
          <input name="shipping" inputMode="decimal" defaultValue={centsToInput(settings.shippingCents) || "0"} className="input w-32" />
          {e.shipping ? <span className="text-sm text-sale">{e.shipping}</span> : <span className="block text-xs text-muted">0 = livraison offerte.</span>}
        </label>
      </section>
      {state?.message && <p className={`rounded-xl p-3 text-sm font-medium ${state.ok ? "bg-ok/10 text-ok" : "bg-sale/10 text-sale"}`}>{state.message}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}
