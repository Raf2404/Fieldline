"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type ReactNode } from "react";
import { DEFAULT_LEAD_TIME, STATUS_LABELS, SURFACES, TAGS, type Status } from "@/lib/catalog";
import { centsToInput, discountPercent, parseEuros } from "@/lib/money";
import { saveProduct, type SaveState } from "@/app/admin/(panel)/articles/actions";
import { DescriptionEditor } from "./description-editor";
import { PhotoManager } from "./photo-manager";
import { SizesEditor } from "./sizes-editor";

export type FormProduct = {
  id: string | null;
  slug: string | null;
  name: string;
  brandId: string;
  model: string | null;
  surfaces: string[];
  priceCents: number | null;
  compareAtCents: number | null;
  costCents: number | null;
  description: string;
  leadTime: string;
  tags: string[];
  status: Status;
  allowBackorder: boolean;
  sizes: { size: string; stock: number }[];
  images: { key: string; url: string }[];
};

function Field({ label, hint, error, required, children }: { label: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-sale"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span className="block text-sm text-sale">{error}</span>}
    </label>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ProductForm({ product, brands, notice, showCost = true }: { product: FormProduct; brands: { id: string; name: string }[]; notice?: string; showCost?: boolean }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProduct, null);
  const e = state?.errors ?? {};
  const [brandId, setBrandId] = useState(product.brandId || (brands[0]?.id ?? "__new"));
  const [price, setPrice] = useState(centsToInput(product.priceCents));
  const [compareAt, setCompareAt] = useState(centsToInput(product.compareAtCents));
  const [cost, setCost] = useState(centsToInput(product.costCents));
  const p = parseEuros(price);
  const off = p && !Number.isNaN(p) ? discountPercent(p, parseEuros(compareAt)) : null;
  const c = parseEuros(cost);
  const margin = p && c && !Number.isNaN(p) && !Number.isNaN(c) ? p - c : null;

  return (
    <form
      // onSubmit plutôt que action={…} : React viderait sinon tous les champs après un envoi refusé.
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
      noValidate
    >
      {product.id && <input type="hidden" name="id" value={product.id} />}

      <div className="sticky top-14 z-20 -mx-4 flex flex-wrap items-center gap-3 border-b border-line bg-[#f3f3ef]/95 px-4 py-3 backdrop-blur">
        <Link href="/admin/articles" className="text-sm text-muted hover:text-ink">← Articles</Link>
        <h1 className="mr-auto truncate text-lg font-bold">{product.id ? product.name || "Article" : "Nouvel article"}</h1>
        {product.id && product.slug && product.status !== "draft" && (
          <a href={`/produit/${product.slug}`} target="_blank" className="btn-secondary btn-sm">Voir sur le site ↗</a>
        )}
        <button className="btn-primary btn-sm" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
      </div>

      {(state?.message || notice) && (
        <p role="status" className={`rounded-xl p-3 text-sm font-medium ${state && !state.ok ? "bg-sale/10 text-sale" : "bg-ok/10 text-ok"}`}>
          {state?.message ?? notice}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card title="Informations">
            <Field label="Nom" required error={e.name}>
              <input name="name" defaultValue={product.name} className="input" placeholder="Mercurial Vapor Elite" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Marque" required error={e.brandId}>
                <select name="brandId" value={brandId} onChange={(ev) => setBrandId(ev.target.value)} className="input">
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                  <option value="__new">+ Autre marque…</option>
                </select>
                {brandId === "__new" && <input name="newBrand" placeholder="Nom de la marque" className="input mt-2" autoFocus />}
              </Field>
              <Field label="Modèle / collection" error={e.model}>
                <input name="model" defaultValue={product.model ?? ""} className="input" placeholder="Vapor 16" />
              </Field>
            </div>
            <Field label="Type de terrain" required error={e.surfaces}>
              <div className="flex flex-wrap gap-2">
                {SURFACES.map((s) => (
                  <label key={s.code} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
                    <input type="checkbox" name="surfaces" value={s.code} defaultChecked={product.surfaces.includes(s.code)} className="sr-only" />
                    {s.label}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Description">
              <DescriptionEditor defaultValue={product.description} />
            </Field>
          </Card>

          <Card title="Photos">
            <PhotoManager initial={product.images} error={e.images} />
          </Card>

          <Card title="Pointures et stock">
            <SizesEditor initial={product.sizes} error={e.sizes} />
            <label className="flex items-start gap-3 rounded-xl bg-paper p-3 text-sm">
              <input type="checkbox" name="allowBackorder" defaultChecked={product.allowBackorder} className="mt-0.5 size-4 accent-ink" />
              <span>
                <span className="font-medium">Vente sur commande</span>
                <span className="block text-muted">Réservation possible même à 0 en stock (tu commandes au fournisseur après chaque vente).</span>
              </span>
            </label>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Statut">
            <select name="status" defaultValue={product.status} className="input">
              {(Object.keys(STATUS_LABELS) as Status[])
                .filter((s) => s !== "deleted")
                .map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
            </select>
            <p className="text-xs text-muted">Quand toutes les pointures sont à 0, l&apos;article s&apos;affiche seul en « Rupture de stock ».</p>
          </Card>

          <Card title="Prix">
            <Field label="Prix de vente (€)" required error={e.priceCents}>
              <input name="price" value={price} onChange={(ev) => setPrice(ev.target.value)} inputMode="decimal" className="input" placeholder="129" />
            </Field>
            <Field label="Prix barré / prix marché (€)" error={e.compareAtCents} hint={off ? `Affiché : -${off} %` : "Optionnel"}>
              <input name="compareAt" value={compareAt} onChange={(ev) => setCompareAt(ev.target.value)} inputMode="decimal" className="input" placeholder="249" />
            </Field>
            {showCost && <Field label="Prix d'achat (€)" error={e.costCents} hint={margin != null ? `Marge brute : ${(margin / 100).toFixed(2).replace(".", ",")} € · visible seulement ici` : "Visible seulement dans l'admin"}>
              <input name="cost" value={cost} onChange={(ev) => setCost(ev.target.value)} inputMode="decimal" className="input" />
            </Field>}
          </Card>

          <Card title="Livraison et mise en avant">
            <Field label="Délai de livraison affiché" required error={e.leadTime}>
              <input name="leadTime" defaultValue={product.leadTime || DEFAULT_LEAD_TIME} className="input" />
            </Field>
            <Field label="Catégories">
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t) => (
                  <label key={t.code} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
                    <input type="checkbox" name="tags" value={t.code} defaultChecked={product.tags.includes(t.code)} className="sr-only" />
                    {t.label}
                  </label>
                ))}
              </div>
            </Field>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </form>
  );
}
