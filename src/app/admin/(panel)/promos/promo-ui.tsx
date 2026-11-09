"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { createPromo, deletePromo, togglePromo } from "./actions";

export function PromoCreate() {
  const [state, action, pending] = useActionState(createPromo, null);
  const [type, setType] = useState("percent");
  const e = state?.errors ?? {};
  return (
    <form
      key={state?.ok ? state.created : "form"}
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid gap-3 rounded-2xl bg-white p-5 sm:grid-cols-2"
    >
      <h2 className="font-semibold sm:col-span-2">Nouveau code</h2>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Code</span>
        <input name="code" placeholder="RENTREE15" className="input uppercase" />
        {e.code && <span className="block text-sale">{e.code}</span>}
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Réduction</span>
        <div className="flex gap-2">
          <select name="type" value={type} onChange={(ev) => setType(ev.target.value)} className="input w-auto">
            <option value="percent">%</option>
            <option value="fixed">€</option>
          </select>
          <input name="value" inputMode="decimal" placeholder={type === "percent" ? "15" : "10"} className="input" />
        </div>
        {e.value && <span className="block text-sale">{e.value}</span>}
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Date de fin <span className="font-normal text-muted">(facultatif)</span></span>
        <input name="endsAt" type="date" className="input" />
        {e.endsAt && <span className="block text-sale">{e.endsAt}</span>}
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Utilisations max. <span className="font-normal text-muted">(facultatif)</span></span>
        <input name="maxUses" type="number" min={1} className="input" />
        {e.maxUses && <span className="block text-sale">{e.maxUses}</span>}
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Montant minimum du panier (€) <span className="font-normal text-muted">(facultatif)</span></span>
        <input name="min" inputMode="decimal" className="input" />
        {e.min && <span className="block text-sale">{e.min}</span>}
      </label>
      <div className="flex items-end">
        <button className="btn-primary" disabled={pending}>{pending ? "Création…" : "Créer le code"}</button>
      </div>
      {state?.ok && <p className="text-sm font-medium text-ok sm:col-span-2">Code créé ✓</p>}
    </form>
  );
}

export function PromoRowActions({ id, active, code }: { id: string; active: boolean; code: string }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-50" : ""}`}>
      <button type="button" onClick={() => start(() => togglePromo(id, !active))} className="btn-secondary btn-sm">
        {active ? "Désactiver" : "Réactiver"}
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm(`Supprimer le code ${code} ? Les commandes qui l'ont utilisé gardent leur remise.`)) start(() => deletePromo(id));
        }}
        className="text-xs font-medium text-sale hover:underline"
      >
        Supprimer
      </button>
    </div>
  );
}
