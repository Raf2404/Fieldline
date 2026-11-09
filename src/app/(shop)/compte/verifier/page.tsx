import type { Metadata } from "next";
import { Suspense } from "react";
import { confirmLogin } from "../actions";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default function VerifyPage({ searchParams }: PageProps<"/compte/verifier">) {
  return (
    <div className="mx-auto max-w-md px-4 pt-10">
      <h1 className="text-3xl font-extrabold uppercase tracking-tight">Connexion</h1>
      <Suspense>
        <Confirm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Confirm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const jeton = typeof sp.jeton === "string" ? sp.jeton : "";
  return (
    <form action={confirmLogin} className="mt-6 space-y-3 rounded-2xl bg-white p-5">
      <input type="hidden" name="jeton" value={jeton} />
      <p className="text-sm text-muted">Clique pour accéder à ton espace client.</p>
      <button className="btn-primary w-full">Accéder à mon espace</button>
    </form>
  );
}
