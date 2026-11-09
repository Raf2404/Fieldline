import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginLinkForm } from "./login-link-form";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

export default function CustomerLoginPage({ searchParams }: PageProps<"/compte/connexion">) {
  return (
    <div className="mx-auto max-w-md px-4 pt-10">
      <h1 className="text-3xl font-extrabold uppercase tracking-tight">Mon compte</h1>
      <p className="mt-2 text-muted">
        Pas de mot de passe à retenir : indique ton e-mail, on t&apos;envoie un lien de connexion. Ton compte est créé automatiquement et
        retrouve les commandes passées avec cet e-mail.
      </p>
      <Suspense>
        <Expired searchParams={searchParams} />
      </Suspense>
      <LoginLinkForm />
    </div>
  );
}

async function Expired({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  if (!sp.expire) return null;
  return <p className="mt-4 rounded-xl bg-sale/10 p-3 text-sm text-sale">Ce lien a expiré ou a déjà servi. Demande-en un nouveau.</p>;
}
