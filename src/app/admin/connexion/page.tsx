import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion admin", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center"><Logo href="/" size="lg" /></div>
        <div className="rounded-3xl bg-white p-7">
        <h1 className="mb-6 text-lg font-bold">Espace de gestion</h1>
        <LoginForm />
        </div>
      </div>
    </main>
  );
}
