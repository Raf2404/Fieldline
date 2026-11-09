import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdmin } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { logout } from "../connexion/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { RunExpiry } from "@/components/admin/run-expiry";

// Tout l'admin dépend de la session : pas de rendu « instantané » à valider.
export const instant = false;

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-[#f3f3ef] pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/admin" className="font-black uppercase tracking-tight">
            {SITE.name} <span className="font-medium normal-case text-muted">· gestion</span>
          </Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link href="/" target="_blank" className="hidden rounded-full px-3 py-1.5 hover:bg-black/5 sm:block">
              Voir le site ↗
            </Link>
            <Suspense>
              <AdminBadge />
            </Suspense>
          </div>
        </div>
      </header>
      <RunExpiry />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-black/5" />}>{children}</Suspense>
      </div>
    </div>
  );
}

async function AdminBadge() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <form action={logout}>
      <button className="rounded-full px-3 py-1.5 text-muted hover:bg-black/5 hover:text-ink">Déconnexion</button>
    </form>
  );
}
