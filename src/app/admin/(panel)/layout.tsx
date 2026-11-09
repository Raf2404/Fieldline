import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdmin } from "@/lib/auth";
import { Logo } from "@/components/brand";
import { logout } from "../connexion/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { RunExpiry } from "@/components/admin/run-expiry";

// Tout l'admin dépend de la session : pas de rendu « instantané » à valider.
export const instant = false;

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-[#f3f3ef] pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Logo href="/admin" />
          <Suspense fallback={<AdminNav role="staff" />}>
            <NavForRole />
          </Suspense>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link href="/" target="_blank" className="hidden whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-white/10 sm:block">
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

async function NavForRole() {
  const admin = await getAdmin();
  return <AdminNav role={admin?.role ?? "staff"} />;
}

async function AdminBadge() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <form action={logout}>
      <button className="whitespace-nowrap rounded-full px-3 py-1.5 text-white/60 hover:bg-white/10 hover:text-white">Déconnexion</button>
    </form>
  );
}
