import type { Metadata } from "next";
import Link from "next/link";
import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "Suivre ma commande", description: "Suis ta commande Fieldline avec ton numéro de commande et ton e-mail." };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-10">
      <h1 className="text-3xl font-extrabold uppercase tracking-tight">Suivre ma commande</h1>
      <p className="mt-2 text-muted">Pas besoin de compte : ton numéro de commande figure dans l&apos;e-mail de confirmation.</p>
      <TrackForm />
      <p className="mt-6 text-sm text-muted">
        Tu as un espace client ? <Link href="/compte" className="font-semibold text-ink underline">Retrouve toutes tes commandes</Link>.
      </p>
    </div>
  );
}
