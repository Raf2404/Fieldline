"use client";

import { startTransition, useActionState, useState } from "react";
import { submitRequest } from "@/app/(shop)/commande/[token]/actions";

export function OrderRequest({ token, canReturn }: { token: string; canReturn: boolean }) {
  const [type, setType] = useState<"probleme" | "retour" | null>(null);
  const [state, action, pending] = useActionState(submitRequest, null);
  if (state?.ok) return <p className="rounded-xl bg-ok/10 p-4 text-sm font-medium text-ok">Demande envoyée ! On te répond très vite par e-mail ou WhatsApp.</p>;
  if (!type) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setType("probleme")} className="btn-secondary btn-sm">Signaler un problème</button>
        {canReturn && <button type="button" onClick={() => setType("retour")} className="btn-secondary btn-sm">Demander un retour</button>}
      </div>
    );
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
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="type" value={type} />
      <p className="text-sm font-semibold">{type === "retour" ? "Demander un retour" : "Signaler un problème"}</p>
      <textarea
        name="message"
        rows={3}
        required
        placeholder={type === "retour" ? "Quel article, et pourquoi ? (taille, défaut…)" : "Décris le problème…"}
        className="input"
      />
      {state?.error && <p className="text-sm text-sale">{state.error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary btn-sm" disabled={pending}>{pending ? "Envoi…" : "Envoyer"}</button>
        <button type="button" onClick={() => setType(null)} className="btn-secondary btn-sm">Annuler</button>
      </div>
    </form>
  );
}
