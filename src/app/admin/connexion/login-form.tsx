"use client";

import { startTransition, useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">E-mail</span>
        <input name="email" type="email" required autoComplete="username" className="input" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Mot de passe</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {state?.error && <p className="text-sm text-sale">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
