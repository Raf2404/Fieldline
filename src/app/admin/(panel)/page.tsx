import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats } from "@/lib/admin-data";
import { countOrdersByStatus, getOrderAlerts } from "@/lib/admin-orders";
import { orderRef } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

export default async function AdminHome() {
  const admin = await requireAdmin();
  const [s, orders, settings, alerts] = await Promise.all([getDashboardStats(), countOrdersByStatus(), getSettings(), getOrderAlerts()]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bonjour {admin.name} 👋</h1>
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
      <section className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">
        Chiffre d&apos;affaires et commandes en retard (plus de 21 jours) arrivent avec la phase 5.
      </section>
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
