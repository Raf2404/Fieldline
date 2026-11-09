import Link from "next/link";
import { Suspense } from "react";
import { readCart } from "@/lib/cart";
import { BagIcon, TruckIcon } from "@/components/icons";
import { SITE } from "@/lib/site";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="bg-ink px-4 py-2 text-center text-xs font-medium text-white">
        <TruckIcon className="mr-1.5 inline size-4 align-[-3px] text-accent" />
        Livraison suivie en {SITE.defaultLeadTime} · Réservation en 2 minutes
      </div>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-lg font-black uppercase tracking-tight">
            {SITE.name}
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link href="/catalogue" className="rounded-full px-3 py-2 hover:bg-black/5">
              Catalogue
            </Link>
            <Link href="/suivi" className="hidden rounded-full px-3 py-2 hover:bg-black/5 sm:block">
              Suivre ma commande
            </Link>
            <Link href="/panier" aria-label="Panier" className="relative rounded-full p-2 hover:bg-black/5">
              <BagIcon />
              <Suspense>
                <CartCount />
              </Suspense>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-base font-black uppercase">{SITE.name}</p>
            <p className="text-muted">{SITE.tagline}. Produits authentiques uniquement.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Aide</p>
            <ul className="space-y-1.5 text-muted">
              <li><Link href="/suivi" className="hover:text-ink">Suivre ma commande</Link></li>
              <li><Link href="/faq" className="hover:text-ink">FAQ</Link></li>
              <li><Link href="/guide-des-tailles" className="hover:text-ink">Guide des tailles</Link></li>
              <li><Link href="/contact" className="hover:text-ink">Contact</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Informations</p>
            <ul className="space-y-1.5 text-muted">
              <li><Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link></li>
              <li><Link href="/cgv" className="hover:text-ink">CGV</Link></li>
              <li><Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link></li>
              <li><Link href="/retours" className="hover:text-ink">Politique de retour</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}

async function CartCount() {
  const n = (await readCart()).reduce((sum, l) => sum + l.q, 0);
  if (!n) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink">
      {n}
    </span>
  );
}
