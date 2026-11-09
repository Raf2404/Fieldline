"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tableau de bord", short: "Accueil" },
  { href: "/admin/articles", label: "Articles", short: "Articles" },
  { href: "/admin/commandes", label: "Commandes", short: "Commandes" },
  { href: "/admin/clients", label: "Clients", short: "Clients" },
  { href: "/admin/promos", label: "Codes promo", short: "Promos" },
  { href: "/admin/reglages", label: "Réglages", short: "Réglages", owner: true },
  { href: "/admin/equipe", label: "Équipe", short: "Équipe", owner: true },
  { href: "/admin/securite", label: "Sécurité", short: "Sécurité" },
];

/** Onglets en haut sur ordinateur, barre défilante en bas sur téléphone. */
export function AdminNav({ role }: { role: string }) {
  const path = usePathname();
  const links = LINKS.filter((l) => !l.owner || role === "owner");
  const active = (href: string) => (href === "/admin" ? path === href : path.startsWith(href));
  return (
    <>
      <nav className="hidden gap-0.5 text-sm lg:flex">
        {links.map((l) => (
          <Link key={l.href} href={l.href} title={l.label} className={`whitespace-nowrap rounded-full px-2.5 py-1.5 ${active(l.href) ? "bg-white text-ink" : "text-white/80 hover:bg-white/10"}`}>
            {l.short}
          </Link>
        ))}
      </nav>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-line bg-white text-xs font-medium lg:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`shrink-0 grow px-3 py-3.5 text-center ${active(l.href) ? "text-ink" : "text-muted"}`}>
            {l.short}
          </Link>
        ))}
      </nav>
    </>
  );
}
