import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { BagIcon, TruckIcon, UserIcon } from "@/components/icons";
import { readCart } from "@/lib/cart";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  const socials = (["instagram", "tiktok", "snapchat"] as const).filter((k) => settings[k]);
  return (
    <>
      <div className="bg-accent px-4 py-1.5 text-center text-xs font-semibold text-ink">
        <TruckIcon className="mr-1.5 inline size-4 align-[-3px]" />
        Livraison suivie en {settings.defaultLeadTime}
        <span className="hidden sm:inline"> · Réservation en 2 minutes</span>
      </div>
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="flex items-center gap-0.5 text-sm font-medium">
            <Link href="/catalogue" className="rounded-full px-3 py-2 hover:bg-white/10">
              Catalogue
            </Link>
            <Link href="/suivi" className="hidden rounded-full px-3 py-2 hover:bg-white/10 sm:block">
              Suivre ma commande
            </Link>
            <Link href="/compte" aria-label="Mon compte" className="rounded-full p-2 hover:bg-white/10">
              <UserIcon />
            </Link>
            <Link href="/panier" aria-label="Panier" className="relative rounded-full p-2 hover:bg-white/10">
              <BagIcon />
              <Suspense>
                <CartCount />
              </Suspense>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 bg-ink text-white">
        <div className="stripes h-1.5 opacity-90" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
          <div className="space-y-3">
            <Image src="/brand/fieldline-logo.png" alt="Fieldline" width={150} height={99} />
            <p className="text-white/60">{SITE.tagline}. Produits authentiques uniquement.</p>
            {socials.length > 0 && (
              <ul className="flex gap-3 text-white/70">
                {socials.map((k) => (
                  <li key={k}><a href={settings[k]} target="_blank" rel="noopener" className="capitalize hover:text-white">{k}</a></li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Aide</p>
            <ul className="space-y-1.5 text-white/60">
              <li><Link href="/suivi" className="hover:text-white">Suivre ma commande</Link></li>
              <li><Link href="/compte" className="hover:text-white">Mon compte</Link></li>
              <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link href="/guide-des-tailles" className="hover:text-white">Guide des tailles</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Informations</p>
            <ul className="space-y-1.5 text-white/60">
              <li><Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link></li>
              <li><Link href="/cgv" className="hover:text-white">CGV</Link></li>
              <li><Link href="/confidentialite" className="hover:text-white">Confidentialité</Link></li>
              <li><Link href="/retours" className="hover:text-white">Politique de retour</Link></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs text-white/40">© {SITE.name}</p>
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
