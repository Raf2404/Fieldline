"use client";

import { startTransition, useActionState, useTransition } from "react";
import { changePassword, confirmTotp, disableTotp, startTotpSetup } from "./actions";

const onSubmit = (fn: (fd: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => fn(fd));
};

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form onSubmit={onSubmit(action)} className="space-y-3">
      <input name="current" type="password" autoComplete="current-password" placeholder="Mot de passe actuel" className="input" aria-label="Mot de passe actuel" />
      <input name="next" type="password" autoComplete="new-password" placeholder="Nouveau mot de passe (12 caractères min.)" className="input" aria-label="Nouveau mot de passe" />
      <input name="confirm" type="password" autoComplete="new-password" placeholder="Confirmer le nouveau mot de passe" className="input" aria-label="Confirmer" />
      {state?.error && <p className="text-sm text-sale">{state.error}</p>}
      {state?.ok && <p className="text-sm font-medium text-ok">Mot de passe modifié ✓</p>}
      <button className="btn-primary btn-sm" disabled={pending}>Changer le mot de passe</button>
    </form>
  );
}

export function TotpSetup({ enabled, pendingSetup, qrSvg, secret }: { enabled: boolean; pendingSetup: boolean; qrSvg: string | null; secret: string | null }) {
  const [starting, start] = useTransition();
  const [cState, confirm, cPending] = useActionState(confirmTotp, null);
  const [dState, disable, dPending] = useActionState(disableTotp, null);

  if (enabled) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-ok/10 p-3 text-sm font-medium text-ok">Double authentification activée ✓</p>
        <form onSubmit={onSubmit(disable)} className="flex flex-wrap gap-2">
          <input name="code" inputMode="numeric" maxLength={7} placeholder="Code actuel" className="input w-36 py-2" aria-label="Code pour désactiver" />
          <button className="btn-secondary btn-sm" disabled={dPending}>Désactiver</button>
        </form>
        {dState?.error && <p className="text-sm text-sale">{dState.error}</p>}
      </div>
    );
  }
  if (!pendingSetup) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">Recommandé : en plus du mot de passe, un code à 6 chiffres de ton téléphone sera demandé à chaque connexion.</p>
        <button type="button" disabled={starting} onClick={() => start(() => startTotpSetup())} className="btn-primary btn-sm">Activer la double authentification</button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>Installe une application d&apos;authentification (Google Authenticator, Microsoft Authenticator…).</li>
        <li>Scanne ce QR code avec l&apos;application.</li>
        <li>Saisis le code à 6 chiffres affiché pour confirmer.</li>
      </ol>
      {qrSvg && <div className="size-48 rounded-xl bg-white p-2 ring-1 ring-line" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
      {secret && <p className="text-xs text-muted">Clé à saisir à la main si besoin : <code className="select-all font-mono text-ink">{secret}</code></p>}
      <form onSubmit={onSubmit(confirm)} className="flex flex-wrap gap-2">
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" className="input w-36 py-2" aria-label="Code de confirmation" />
        <button className="btn-primary btn-sm" disabled={cPending}>Confirmer</button>
      </form>
      {cState?.error && <p className="text-sm text-sale">{cState.error}</p>}
    </div>
  );
}
