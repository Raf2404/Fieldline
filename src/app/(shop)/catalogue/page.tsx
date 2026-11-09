import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AutoForm, FilterPanel } from "@/components/catalog-filters";
import { SearchIcon } from "@/components/icons";
import { ProductGrid } from "@/components/product-card";
import { SURFACES } from "@/lib/catalog";
import { SORTS, activeFilterCount, applyFilters, facetValues, parseFilters, type SearchParams } from "@/lib/filters";
import { getPublicCatalog } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Tous nos crampons de football à prix réduit : filtre par marque, pointure, type de terrain et prix.",
};

export default function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="text-3xl font-extrabold uppercase tracking-tight">Catalogue</h1>
      <Suspense fallback={<GridSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const chip =
  "inline-flex cursor-pointer select-none items-center rounded-full border border-line bg-white px-3 py-1.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white";

async function Results({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [all, sp] = await Promise.all([getPublicCatalog(), searchParams]);
  const f = parseFilters(sp);
  const products = applyFilters(all, f);
  const facets = facetValues(all);
  const count = activeFilterCount(f);

  return (
    <AutoForm className="mt-5 lg:grid lg:grid-cols-[230px_1fr] lg:gap-8">
      <FilterPanel count={count}>
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Marque</legend>
            <div className="flex flex-wrap gap-2">
              {facets.brands.map((b) => (
                <label key={b} className={chip}>
                  <input type="checkbox" name="marque" value={b} defaultChecked={f.marque.includes(b)} className="sr-only" />
                  {b}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Pointure (EU)</legend>
            <div className="grid grid-cols-5 gap-1.5">
              {facets.sizes.map((s) => (
                <label key={s} className={`${chip} justify-center px-0`}>
                  <input type="checkbox" name="pointure" value={s} defaultChecked={f.pointure.includes(s)} className="sr-only" />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Type de terrain</legend>
            <div className="flex flex-col gap-2">
              {SURFACES.filter((s) => facets.surfaces.includes(s.code)).map((s) => (
                <label key={s.code} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="terrain" value={s.code} defaultChecked={f.terrain.includes(s.code)} className="size-4 accent-ink" />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Prix (€)</legend>
            <div className="flex items-center gap-2">
              <input type="number" name="min" inputMode="numeric" min={0} placeholder="Min" defaultValue={f.min ?? ""} className="input py-2" />
              <span className="text-muted">–</span>
              <input type="number" name="max" inputMode="numeric" min={0} placeholder="Max" defaultValue={f.max ?? ""} className="input py-2" />
            </div>
          </fieldset>
          {count > 0 && (
            <Link href="/catalogue" className="inline-block text-sm font-semibold underline underline-offset-4">
              Effacer les filtres
            </Link>
          )}
        </div>
      </FilterPanel>

      <div className="mt-4 lg:mt-0">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-56">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input type="search" name="q" defaultValue={f.q} placeholder="Rechercher un modèle…" className="input py-2 pl-9" />
          </label>
          <select name="tri" defaultValue={f.tri} aria-label="Trier" className="input w-auto py-2">
            {SORTS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <p className="mb-4 text-sm text-muted">
          {products.length} article{products.length > 1 ? "s" : ""}
        </p>
        {products.length ? (
          <ProductGrid products={products} priorityCount={4} />
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            Aucun article ne correspond à ces filtres.
          </div>
        )}
      </div>
    </AutoForm>
  );
}

function GridSkeleton() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-2xl bg-black/5" />
      ))}
    </div>
  );
}
