"use client";

import Link from "next/link";
import { startTransition, useActionState, type ReactNode } from "react";
import { placeOrder, type CheckoutState } from "@/app/(shop)/panier/actions";
import { WhatsAppIcon } from "./icons";

function F({ label, name, error, className, ...input }: { label: string; name: string; error?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      <span className="text-sm font-medium">{label}</span>
      <input name={name} className={`input ${error ? "border-sale" : ""}`} {...input} />
      {error && <span className="block text-sm text-sale">{error}</span>}
    </label>
  );
}

export function CheckoutForm({ summary, defaults = {} }: { summary: ReactNode; defaults?: Record<string, string> }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, null);
  const e = state?.errors ?? {};
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
      noValidate
      className="grid gap-5 lg:grid-cols-[1fr_360px]"
    >
      <div className="space-y-5">
        <section className="space-y-3 rounded-2xl bg-white p-5">
          <h2 className="font-semibold">Tes coordonnées</h2>
          <div className="grid grid-cols-2 gap-3">
            <F label="Prénom" name="firstName" autoComplete="given-name" defaultValue={defaults.firstName} error={e.firstName} />
            <F label="Nom" name="lastName" autoComplete="family-name" defaultValue={defaults.lastName} error={e.lastName} />
          </div>
          <F label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={defaults.email} error={e.email} />
          <F label="Téléphone (WhatsApp de préférence)" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="06 12 34 56 78" defaultValue={defaults.phone} error={e.phone} />
        </section>
        <section className="space-y-3 rounded-2xl bg-white p-5">
          <h2 className="font-semibold">Adresse de livraison</h2>
          <F label="Adresse" name="address1" autoComplete="address-line1" defaultValue={defaults.address1} error={e.address1} />
          <F label="Complément (appartement, bâtiment…)" name="address2" autoComplete="address-line2" defaultValue={defaults.address2} />
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <F label="Code postal" name="postalCode" autoComplete="postal-code" inputMode="numeric" maxLength={5} defaultValue={defaults.postalCode} error={e.postalCode} />
            <F label="Ville" name="city" autoComplete="address-level2" defaultValue={defaults.city} error={e.city} />
          </div>
          <p className="text-xs text-muted">Livraison en France métropolitaine.</p>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Un message pour nous ? <span className="font-normal text-muted">(facultatif)</span></span>
            <textarea name="customerNote" rows={2} maxLength={500} className="input" />
          </label>
        </section>
        {/* Champ piège invisible : seuls les robots le remplissent. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        {summary}
        <div className="space-y-3 rounded-2xl bg-white p-5">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="cgv" className="mt-0.5 size-4 shrink-0 accent-ink" />
            <span>
              J&apos;accepte les <Link href="/cgv" target="_blank" className="underline">conditions générales de vente</Link>.
              Ma commande sera confirmée à réception du paiement.
            </span>
          </label>
          {e.cgv && <p className="text-sm text-sale">{e.cgv}</p>}
          {state?.error && <p role="alert" className="rounded-xl bg-sale/10 p-3 text-sm font-medium text-sale">{state.error}</p>}
          <button className="btn-primary w-full py-4 text-base" disabled={pending}>
            {pending ? "Validation…" : "Valider ma commande"}
          </button>
          <p className="flex items-start gap-2 text-xs text-muted">
            <WhatsAppIcon className="mt-0.5 size-4 shrink-0" />
            Après validation, tu nous envoies ton numéro de commande sur WhatsApp pour régler. Ta paire est réservée pendant ce temps.
          </p>
        </div>
      </aside>
    </form>
  );
}
