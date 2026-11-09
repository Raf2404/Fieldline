"use client";

import { startTransition, useActionState } from "react";
import { deleteAccount, updateProfile } from "./actions";

type P = { firstName: string; lastName: string; phone: string; address1: string; address2: string; postalCode: string; city: string };

export function ProfileForm({ customer }: { customer: P }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const f = (name: keyof P, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input name={name} defaultValue={customer[name]} className="input" {...extra} />
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-3 rounded-2xl bg-white p-5"
    >
      <div className="grid grid-cols-2 gap-3">
        {f("firstName", "Prénom", { autoComplete: "given-name" })}
        {f("lastName", "Nom", { autoComplete: "family-name" })}
      </div>
      {f("phone", "Téléphone", { type: "tel", autoComplete: "tel" })}
      {f("address1", "Adresse", { autoComplete: "address-line1" })}
      {f("address2", "Complément", { autoComplete: "address-line2" })}
      <div className="grid grid-cols-[120px_1fr] gap-3">
        {f("postalCode", "Code postal", { inputMode: "numeric", maxLength: 5 })}
        {f("city", "Ville")}
      </div>
      {state?.error && <p className="text-sm text-sale">{state.error}</p>}
      {state?.ok && <p className="text-sm font-medium text-ok">Informations enregistrées.</p>}
      <button className="btn-primary btn-sm" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

export function DeleteAccount() {
  return (
    <form
      action={deleteAccount}
      onSubmit={(e) => {
        if (!confirm("Supprimer définitivement ton compte ?")) e.preventDefault();
      }}
    >
      <button className="mt-3 text-sm font-semibold text-sale underline">Supprimer mon compte</button>
    </form>
  );
}
