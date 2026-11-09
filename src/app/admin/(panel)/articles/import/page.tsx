import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { CSV_COLUMNS } from "@/lib/csv";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Importer des articles" };

export default async function ImportPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/articles" className="text-sm text-muted hover:text-ink">← Articles</Link>
      <h1 className="text-2xl font-bold">Importer des articles (CSV)</h1>
      <div className="space-y-3 rounded-2xl bg-white p-5 text-sm">
        <p>Le plus simple : 
        <a download href="/admin/articles/export" className="font-semibold underline">exporte le catalogue</a>, modifie-le dans Excel ou Google Sheets, puis réimporte-le ici.</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Une ligne dont le <b>slug</b> existe déjà met l&apos;article à jour ; sinon un nouvel article est créé.</li>
          <li><b>pointures</b> : « 40:2|41:5|42.5:0 » (pointure:quantité séparées par |).</li>
          <li><b>terrains</b> et <b>tags</b> : séparés par | (ex. « FG|AG », « promo|nouveaute »).</li>
          <li><b>statut</b> : online, out_of_stock, coming_soon ou draft. <b>sur_commande</b> : oui / non.</li>
          <li>Les photos s&apos;ajoutent ensuite depuis la fiche de chaque article.</li>
        </ul>
        <p className="text-xs text-muted">Colonnes : {CSV_COLUMNS.join(" ; ")}</p>
      </div>
      <ImportForm />
    </div>
  );
}
