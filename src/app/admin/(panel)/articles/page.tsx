import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAdminProducts, listBrands } from "@/lib/admin-data";
import { STATUS_LABELS } from "@/lib/catalog";
import { imageUrl } from "@/lib/storage";
import { ProductList } from "@/components/admin/product-list";

export const metadata: Metadata = { title: "Articles" };

export default async function ArticlesPage({ searchParams }: PageProps<"/admin/articles">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const f = { q: one(sp.q).trim(), status: one(sp.statut), brand: one(sp.marque) };
  const [rows, brands] = await Promise.all([listAdminProducts(f), listBrands()]);
  const filtered = Boolean(f.q || f.status || f.brand);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Articles</h1>
        
        <a download href="/admin/articles/export" className="btn-secondary btn-sm">Exporter CSV</a>
        <Link href="/admin/articles/import" className="btn-secondary btn-sm">Importer CSV</Link>
        <Link href="/admin/articles/nouveau" className="btn-primary btn-sm">+ Ajouter un article</Link>
      </div>

      <Form action="/admin/articles" className="flex flex-wrap gap-2">
        <input name="q" type="search" defaultValue={f.q} placeholder="Rechercher…" className="input max-w-xs flex-1 py-2" />
        <select name="statut" defaultValue={f.status} className="input w-auto py-2">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="marque" defaultValue={f.brand} className="input w-auto py-2">
          <option value="">Toutes les marques</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button className="btn-secondary btn-sm">Filtrer</button>
        {filtered && <Link href="/admin/articles" className="self-center text-sm underline">Tout afficher</Link>}
      </Form>

      {rows.length ? (
        <ProductList
          key={rows.map((r) => `${r.id}:${r.position}:${r.status}:${r.priceCents}:${r.totalStock}`).join(",")}
          rows={rows.map((r) => ({ ...r, thumb: r.image ? imageUrl(r.image, "sm") : null }))}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-muted">
          {filtered ? "Aucun article ne correspond." : "Aucun article pour l'instant."}
        </div>
      )}
      <p className="text-xs text-muted">
        Astuce : glisse la poignée ⠿ pour choisir l&apos;ordre d&apos;affichage sur le site.
      </p>
    </div>
  );
}
