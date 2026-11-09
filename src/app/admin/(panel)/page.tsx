import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats } from "@/lib/admin-data";

export default async function AdminHome() {
  const admin = await requireAdmin();
  const s = await getDashboardStats();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bonjour {admin.name} 👋</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Articles en ligne" value={s.online} href="/admin/articles?statut=online" />
        <Stat label="Brouillons" value={s.draft} href="/admin/articles?statut=draft" />
        <Stat label="Articles au total" value={s.total} href="/admin/articles" />
        <Stat label="Alertes « Me prévenir »" value={s.backInStock} />
      </div>
      <section className="rounded-2xl bg-white p-5">
        <h2 className="font-semibold">Stock bas</h2>
        {s.lowStock.length ? (
          <ul className="mt-3 divide-y divide-line text-sm">
            {s.lowStock.map((l) => (
              <li key={`${l.id}-${l.size}`} className="flex items-center justify-between py-2">
                <Link href={`/admin/articles/${l.id}`} className="hover:underline">
                  {l.name} <span className="text-muted">· {l.size}</span>
                </Link>
                <span className={`font-semibold ${l.stock === 0 ? "text-sale" : "text-warn"}`}>
                  {l.stock === 0 ? "Épuisé" : `${l.stock} restante${l.stock > 1 ? "s" : ""}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Rien à signaler.</p>
        )}
      </section>
      <section className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">
        Chiffre d&apos;affaires, commandes par statut et commandes en retard apparaîtront ici avec le module commandes (étapes 3 à 5).
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-2xl bg-white p-4 transition hover:ring-2 hover:ring-ink/10">{inner}</Link>
  ) : (
    <div className="rounded-2xl bg-white p-4">{inner}</div>
  );
}
