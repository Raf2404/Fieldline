"use client";

import { startTransition, useActionState, type ReactNode } from "react";
import type { ShopSettings } from "@/lib/settings";
import { centsToInput } from "@/lib/money";
import { ORDER_STATUS, formatPhone, type OrderStatusCode } from "@/lib/orders";
import { saveShopSettings, type SettingsState } from "./actions";

type Defaults = Record<string, { subject: string; title: string; text: string }>;

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-sm text-sale">{error}</span> : hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsForm({ settings, emailDefaults }: { settings: ShopSettings; emailDefaults: Defaults }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveShopSettings, null);
  const e = state?.errors ?? {};
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
      className="max-w-2xl space-y-4"
    >
      <Card title="Paiement via WhatsApp">
        <Field label="Numéro WhatsApp de la boutique" error={e.whatsapp} hint="Le bouton « Envoyer ma commande sur WhatsApp » apparaît après chaque commande. Vide : le client est renvoyé vers la page contact.">
          <input name="whatsapp" type="tel" defaultValue={settings.whatsapp ? formatPhone(settings.whatsapp) : ""} placeholder="06 12 34 56 78" className="input" />
        </Field>
        <Field label="Infos de paiement affichées après la commande (facultatif)">
          <textarea name="paymentInfo" rows={3} defaultValue={settings.paymentInfo} placeholder="Ex. : Paiement accepté par virement ou Wero. Les instructions te sont envoyées sur WhatsApp." className="input" />
        </Field>
        <Field label="Durée de réservation sans paiement (heures)" error={e.paymentDelayHours} hint="Passé ce délai, la commande est annulée et les paires reviennent en stock.">
          <input name="paymentDelayHours" type="number" min={1} max={336} defaultValue={settings.paymentDelayHours} className="input w-32" />
        </Field>
      </Card>

      <Card title="Livraison">
        <Field label="Frais de port par commande (€)" error={e.shipping} hint="0 = livraison offerte.">
          <input name="shipping" inputMode="decimal" defaultValue={centsToInput(settings.shippingCents) || "0"} className="input w-32" />
        </Field>
        <Field label="Délai de livraison affiché" error={e.defaultLeadTime} hint="Bandeau du site, accueil et valeur proposée pour chaque nouvel article.">
          <input name="defaultLeadTime" defaultValue={settings.defaultLeadTime} className="input" />
        </Field>
      </Card>

      <Card title="Réseaux sociaux">
        {(["instagram", "tiktok", "snapchat"] as const).map((k) => (
          <Field key={k} label={k[0].toUpperCase() + k.slice(1)} error={e[k]}>
            <input name={k} type="url" defaultValue={settings[k]} placeholder={`https://www.${k}.com/…`} className="input" />
          </Field>
        ))}
      </Card>

      <Card title="Informations légales">
        <p className="text-xs text-muted">Utilisées pour les mentions légales, les CGV et les factures.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom ou raison sociale"><input name="legalName" defaultValue={settings.legalName} className="input" /></Field>
          <Field label="Statut" hint="Ex. : Entrepreneur individuel (micro-entreprise)"><input name="legalStatus" defaultValue={settings.legalStatus} className="input" /></Field>
          <Field label="SIRET" error={e.siret}><input name="siret" inputMode="numeric" defaultValue={settings.siret} className="input" /></Field>
          <Field label="E-mail de contact"><input name="contactEmail" type="email" defaultValue={settings.contactEmail} className="input" /></Field>
        </div>
        <Field label="Adresse"><textarea name="legalAddress" rows={2} defaultValue={settings.legalAddress} className="input" /></Field>
      </Card>

      <Card title="Textes des e-mails">
        <p className="text-xs text-muted">
          Laisse vide pour garder le texte par défaut (affiché en gris). Variables : {"{prenom}"}, {"{commande}"}, {"{total}"}, {"{date_livraison}"}.
          Une ligne vide crée un nouveau paragraphe. Les boutons (WhatsApp, suivi du colis…) et le récapitulatif sont ajoutés automatiquement.
        </p>
        {Object.entries(emailDefaults).map(([k, d]) => (
          <details key={k} className="rounded-xl border border-line p-3" open={Boolean(settings.emailTexts[k as keyof typeof settings.emailTexts])}>
            <summary className="cursor-pointer text-sm font-medium">{ORDER_STATUS[k as OrderStatusCode].label}</summary>
            <textarea name={`email_${k}`} rows={4} defaultValue={settings.emailTexts[k as keyof typeof settings.emailTexts] ?? ""} placeholder={d.text} className="input mt-2 text-sm" />
          </details>
        ))}
      </Card>

      {state?.message && <p className={`rounded-xl p-3 text-sm font-medium ${state.ok ? "bg-ok/10 text-ok" : "bg-sale/10 text-sale"}`}>{state.message}</p>}
      <div className="sticky bottom-16 lg:bottom-4">
        <button className="btn-primary shadow-lg" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer les réglages"}</button>
      </div>
    </form>
  );
}
