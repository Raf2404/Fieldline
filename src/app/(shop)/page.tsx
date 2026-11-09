import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProductGrid } from "@/components/product-card";
import { LockIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { getPublicCatalog } from "@/lib/queries";
import { SITE } from "@/lib/site";

export default function HomePage() {
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Jusqu&apos;à -50 % sur les crampons pro</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
            Les crampons des pros, sans le prix des pros.
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Réserve ta paire en 2 minutes. On la commande pour toi et tu suis chaque étape jusqu&apos;à la livraison.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/catalogue" className="btn bg-accent text-ink hover:bg-accent/85">
              Voir le catalogue
            </Link>
            <Link href="/faq" className="btn border border-white/25 text-white hover:border-white">
              Comment ça marche ?
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-5 text-sm sm:grid-cols-3">
          <li className="flex items-center gap-3"><ShieldIcon className="shrink-0" /> <span><b>100 % authentiques</b> · neuves, en boîte</span></li>
          <li className="flex items-center gap-3"><TruckIcon className="shrink-0" /> <span><b>Livraison {SITE.defaultLeadTime}</b> · suivi à chaque étape</span></li>
          <li className="flex items-center gap-3"><LockIcon className="shrink-0" /> <span><b>Paiement PayPal</b> · compte ou carte bancaire</span></li>
        </ul>
      </section>

      <Suspense fallback={<HomeSkeleton />}>
        <HomeProducts />
      </Suspense>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="text-2xl font-black uppercase tracking-tight">Comment ça marche</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Tu réserves", "Choisis ton modèle et ta pointure, puis paie en toute sécurité avec PayPal."],
            ["On commande ta paire", "Tu reçois un e-mail à chaque étape : commandée, arrivée chez nous, expédiée."],
            ["Tu la reçois", `Livraison suivie en ${SITE.defaultLeadTime}, avec ton numéro de suivi transporteur.`],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-line bg-white p-5">
              <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-black">{i + 1}</span>
              <p className="mt-3 font-bold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/**
 * Produits mis en avant : lus à chaque visite depuis le cache du catalogue (vidé dès qu'un article change),
 * pour ne jamais afficher un prix ou un stock périmé.
 */
async function HomeProducts() {
  await connection();
  const all = await getPublicCatalog();
  const buyable = all.filter((p) => p.availability.kind !== "out");
  const newest = [...buyable]
    .sort((a, b) => Number(b.tags.includes("nouveaute")) - Number(a.tags.includes("nouveaute")) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  const best = buyable.filter((p) => p.tags.includes("best-seller") && !newest.includes(p)).slice(0, 4);
  return (
    <>
      {newest.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-2xl font-black uppercase tracking-tight">Nouveautés</h2>
            <Link href="/catalogue?tri=nouveaute" className="text-sm font-semibold underline underline-offset-4">Tout voir</Link>
          </div>
          <ProductGrid products={newest} priorityCount={2} />
        </section>
      )}

      {best.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-14">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-2xl font-black uppercase tracking-tight">Meilleures ventes</h2>
            <Link href="/catalogue" className="text-sm font-semibold underline underline-offset-4">Tout voir</Link>
          </div>
          <ProductGrid products={best} />
        </section>
      )}

    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12">
      <div className="mb-5 h-7 w-40 animate-pulse rounded bg-black/5" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-2xl bg-black/5" />
        ))}
      </div>
    </div>
  );
}
