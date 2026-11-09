"use client";

import { startTransition, useActionState } from "react";
import { requestLoginLink } from "../actions";

export function LoginLinkForm() {
  const [state, action, pending] = useActionState(requestLoginLink, null);
  if (state?.ok) {
    return (
      <div className="mt-6 rounded-2xl bg-white p-5">
        <p className="font-semibold">Regarde ta boîte mail 📬</p>
        <p className="mt-1 text-sm text-muted">Un lien de connexion a été envoyé à <b className="text-ink">{state.email}</b>. Il est valable 30 minutes.</p>
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
      className="mt-6 space-y-3 rounded-2xl bg-white p-5"
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium">E-mail</span>
        <input name="email" type="email" autoComplete="email" required className="input" />
      </label>
      {state?.error && <p role="alert" className="text-sm text-sale">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Envoi…" : "Recevoir mon lien de connexion"}</button>
    </form>
  );
}
