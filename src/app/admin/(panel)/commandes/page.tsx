import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ORDER_TABS, countOrdersByStatus, listOrders } from "@/lib/admin-orders";
import { OrderList } from "@/components/admin/order-list";

export const metadata: Metadata = { title: "Commandes" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/commandes">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const tab = one(sp.onglet) || "a-valider";
  const q = one(sp.q).trim();
  const [orders, counts] = await Promise.all([listOrders(tab, q), countOrdersByStatus()]);
  const tabCount = (t: (typeof ORDER_TABS)[number]) => t.statuses.reduce((n, s) => n + (counts[s] ?? 0), 0);
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Commandes</h1>
        <a download href={`/admin/export-commandes?onglet=${tab}`} className="btn-secondary btn-sm">Exporter (CSV)</a>
      </div>
      <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 text-sm">
        {ORDER_TABS.map((t) => {
          const n = tabCount(t);
          return (
            <Link
              key={t.code}
              href={`/admin/commandes?onglet=${t.code}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 font-medium ${tab === t.code ? "bg-ink text-white" : "bg-white hover:bg-black/5"}`}
            >
              {t.label}
              {t.statuses.length > 0 && n > 0 && <span className="ml-1.5 opacity-60">{n}</span>}
            </Link>
          );
        })}
      </nav>
      <Form action="/admin/commandes" className="flex gap-2">
        <input type="hidden" name="onglet" value={tab} />
        <input name="q" type="search" defaultValue={q} placeholder="N° de commande, nom, e-mail, téléphone…" className="input max-w-sm py-2" />
        <button className="btn-secondary btn-sm">Rechercher</button>
      </Form>

      {/* Toujours affichée (même vide) pour garder le message de confirmation d'une action groupée. */}
      <OrderList
          now={now.toISOString()}
          orders={orders.map((o) => ({
            id: o.id,
            number: o.number,
            status: o.status,
            firstName: o.firstName,
            lastName: o.lastName,
            totalCents: o.totalCents,
            createdAt: o.createdAt.toISOString(),
            paidAt: o.paidAt?.toISOString() ?? null,
            paymentDueAt: o.paymentDueAt?.toISOString() ?? null,
            summary: o.items.map((i) => `${i.brand} ${i.productName} (${i.size}${i.quantity > 1 ? ` ×${i.quantity}` : ""})`).join(" · "),
            openRequests: o.openRequests,
          }))}
        />
    </div>
  );
}
