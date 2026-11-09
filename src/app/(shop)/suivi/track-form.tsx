"use client";

import { startTransition, useActionState } from "react";
import { findOrder } from "./actions";

export function TrackForm() {
  const [state, action, pending] = useActionState(findOrder, null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="mt-6 space-y-4 rounded-2xl bg-white p-5"
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium">Numéro de commande</span>
        <input name="numero" inputMode="numeric" placeholder="1042" className="input" required />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">E-mail utilisé pour commander</span>
        <input name="email" type="email" autoComplete="email" className="input" required />
      </label>
      {state?.error && <p role="alert" className="text-sm text-sale">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Recherche…" : "Voir ma commande"}</button>
    </form>
  );
}
