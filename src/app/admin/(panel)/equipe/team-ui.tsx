"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { addMember, removeMember } from "./actions";

export function AddMember() {
  const [state, action, pending] = useActionState(addMember, null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-3 rounded-2xl bg-white p-5"
    >
      <h2 className="font-semibold">Ajouter un accès</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="name" placeholder="Prénom" className="input" aria-label="Prénom" />
        <input name="email" type="email" placeholder="E-mail" className="input" aria-label="E-mail" />
        <select name="role" defaultValue="staff" className="input" aria-label="Rôle">
          <option value="staff">Associé (droits limités)</option>
          <option value="owner">Propriétaire (tous les droits)</option>
        </select>
      </div>
      <p className="text-xs text-muted">Associé : articles, commandes, clients et codes promo. Pas d&apos;accès aux réglages, à l&apos;équipe, au chiffre d&apos;affaires ni aux prix d&apos;achat.</p>
      {state?.error && <p className="text-sm text-sale">{state.error}</p>}
      {state?.password && (
        <div className="rounded-xl bg-accent/30 p-3 text-sm">
          Accès créé pour <b>{state.email}</b>. Mot de passe provisoire (affiché une seule fois, transmets-le de vive voix ou par message) :
          <code className="mt-1 block select-all rounded bg-white px-2 py-1 font-mono text-base">{state.password}</code>
          Il faudra le changer dans « Sécurité » à la première connexion.
        </div>
      )}
      <button className="btn-primary btn-sm" disabled={pending}>Créer l&apos;accès</button>
    </form>
  );
}

export function RemoveMember({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(`Retirer l'accès de ${name} ?`)) start(async () => setError((await removeMember(id)).error));
        }}
        className="text-xs font-medium text-sale hover:underline"
      >
        Retirer
      </button>
      {error && <span className="ml-2 text-xs text-sale">{error}</span>}
    </span>
  );
}
