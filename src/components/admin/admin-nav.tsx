"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; short: string; soon?: boolean }[] = [
  { href: "/admin", label: "Tableau de bord", short: "Accueil" },
  { href: "/admin/articles", label: "Articles", short: "Articles" },
  { href: "/admin/commandes", label: "Commandes", short: "Commandes" },
  { href: "/admin/reglages", label: "Réglages", short: "Réglages" },
];

/** Onglets en haut sur ordinateur, barre fixe en bas sur téléphone. */
export function AdminNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === href : path.startsWith(href));
  return (
    <>
      <nav className="hidden gap-1 text-sm md:flex">
        {LINKS.map((l) =>
          l.soon ? (
            <span key={l.href} className="rounded-full px-3 py-1.5 text-muted/60" title="Arrive à l'étape 3">
              {l.label}
            </span>
          ) : (
            <Link key={l.href} href={l.href} className={`rounded-full px-3 py-1.5 ${active(l.href) ? "bg-ink text-white" : "hover:bg-black/5"}`}>
              {l.label}
            </Link>
          ),
        )}
      </nav>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white text-xs font-medium md:hidden">
        {LINKS.map((l) =>
          l.soon ? (
            <span key={l.href} className="py-3.5 text-center text-muted/60">{l.short}</span>
          ) : (
            <Link key={l.href} href={l.href} className={`py-3.5 text-center ${active(l.href) ? "text-ink" : "text-muted"}`}>
              {l.short}
            </Link>
          ),
        )}
      </nav>
    </>
  );
}
