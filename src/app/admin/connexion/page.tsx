import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion admin", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-7">
        <p className="text-lg font-black uppercase">{SITE.name}</p>
        <h1 className="mb-6 text-sm text-muted">Espace de gestion</h1>
        <LoginForm />
      </div>
    </main>
  );
}
