import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats } from "@/lib/admin-data";
import { countOrdersByStatus, getOrderAlerts, getSalesStats } from "@/lib/admin-orders";
import { formatPrice } from "@/lib/money";
import { orderRef } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const owner = admin.role === "owner";
  const [s, orders, settings, alerts, sales] = await Promise.all([getDashboardStats(), countOrdersByStatus(), getSettings(), getOrderAlerts(), owner ? getSalesStats() : null]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bonjour {admin.name} 👋</h1>
      {(await searchParams).acces && <p className="rounded-xl bg-sale/10 p-3 text-sm text-sale">Cette page est réservée au propriétaire de la boutique.</p>}
      {sales && (
        <section className="grid grid-cols-3 gap-3">
          {([["Aujourd'hui", sales.revenue.day, sales.revenue.dayN], ["Cette semaine", sales.revenue.week, sales.revenue.weekN], ["Ce mois-ci", sales.revenue.month, sales.revenue.monthN]] as const).map(([l, v, n]) => (
            <div key={l} className="rounded-2xl bg-ink p-4 text-white">
              <p className="text-xs text-white/60">{l}</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-accent sm:text-3xl">{formatPrice(v)}</p>
              <p className="text-xs text-white/60">{n} commande{n > 1 ? "s" : ""} payée{n > 1 ? "s" : ""}</p>
            </div>
          ))}
        </section>
      )}
      {!settings.whatsapp && (
        <Link href="/admin/reglages" className="block rounded-2xl bg-warn/10 p-4 text-sm text-warn">
          <b>Numéro WhatsApp non renseigné.</b> Sans lui, les clients ne peuvent pas t&apos;envoyer leur commande pour payer. Ajoute-le dans les réglages →
        </Link>
      )}
      {alerts.openRequests > 0 && (
        <Link href="/admin/commandes?onglet=toutes" className="block rounded-2xl bg-sale/10 p-4 text-sm text-sale">
          <b>{alerts.openRequests} demande{alerts.openRequests > 1 ? "s" : ""} client non traitée{alerts.openRequests > 1 ? "s" : ""}</b> (problème ou retour). Ouvre les commandes concernées →
        </Link>
      )}
      {alerts.late.length > 0 && (
        <section className="rounded-2xl bg-warn/10 p-4 text-sm text-warn">
          <p className="font-bold">Commandes en retard (payées depuis plus de 21 jours)</p>
          <ul className="mt-1 space-y-0.5">
            {alerts.late.map((o) => (
              <li key={o.id}><Link href={`/admin/commandes/${o.id}`} className="underline">{orderRef(o.number)} · {o.firstName} {o.lastName}</Link></li>
            ))}
          </ul>
        </section>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Paiements à valider" value={orders.pending_payment ?? 0} href="/admin/commandes?onglet=a-valider" highlight />
        <Stat label="Payées, à commander" value={orders.paid ?? 0} href="/admin/commandes?onglet=a-commander" highlight />
        <Stat label="En cours" value={(orders.ordered ?? 0) + (orders.received ?? 0)} href="/admin/commandes?onglet=en-cours" />
        <Stat label="Expédiées / livrées" value={(orders.shipped ?? 0) + (orders.delivered ?? 0)} href="/admin/commandes?onglet=expediees" />
      </div>
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
      {sales && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl bg-white p-5">
            <h2 className="font-semibold">Meilleures ventes <span className="text-sm font-normal text-muted">· 90 jours</span></h2>
            {sales.best.length ? (
              <ol className="mt-3 space-y-1.5 text-sm">
                {sales.best.map((b, i) => (
                  <li key={b.name} className="flex justify-between gap-3"><span>{i + 1}. {b.name}</span><b>{b.qty}</b></li>
                ))}
              </ol>
            ) : <p className="mt-2 text-sm text-muted">Pas encore de vente.</p>}
          </section>
          <section className="rounded-2xl bg-white p-5">
            <h2 className="font-semibold">Pointures les plus demandées</h2>
            {sales.sizes.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {sales.sizes.map((z) => (
                  <span key={z.size} className="rounded-xl bg-paper px-3 py-2 text-center text-sm"><b className="block text-base">{z.size}</b>{z.qty} paire{z.qty > 1 ? "s" : ""}</span>
                ))}
              </div>
            ) : <p className="mt-2 text-sm text-muted">Pas encore de vente.</p>}
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, href, highlight }: { label: string; value: number; href?: string; highlight?: boolean }) {
  const inner = (
    <>
      <p className={`text-3xl font-black ${highlight && value > 0 ? "text-warn" : ""}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-2xl bg-white p-4 transition hover:ring-2 hover:ring-ink/10">{inner}</Link>
  ) : (
    <div className="rounded-2xl bg-white p-4">{inner}</div>
  );
}
