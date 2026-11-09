"use client";

import { startTransition, useActionState } from "react";
import { login, verifyLoginCode, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);
  const [codeState, codeAction, codePending] = useActionState<LoginState, FormData>(verifyLoginCode, null);
  const submit = (fn: (fd: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => fn(fd));
  };

  if (state?.step === "code") {
    return (
      <form onSubmit={submit(codeAction)} className="space-y-4">
        <p className="text-sm text-muted">Saisis le code à 6 chiffres affiché dans ton application d&apos;authentification.</p>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} autoFocus placeholder="123 456" className="input text-center text-2xl tracking-[0.3em]" aria-label="Code de vérification" />
        {codeState?.error && <p className="text-sm text-sale">{codeState.error}</p>}
        <button className="btn-primary w-full" disabled={codePending}>{codePending ? "Vérification…" : "Valider"}</button>
      </form>
    );
  }
  return (
    <form onSubmit={submit(action)} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">E-mail</span>
        <input name="email" type="email" required autoComplete="username" className="input" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Mot de passe</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {state?.error && <p className="text-sm text-sale">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}
