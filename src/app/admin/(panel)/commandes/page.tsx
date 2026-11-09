import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ORDER_TABS, countOrdersByStatus, listOrders } from "@/lib/admin-orders";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS, dateFr, orderRef, timeLeft } from "@/lib/orders";

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
      <h1 className="text-2xl font-bold">Commandes</h1>
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

      {orders.length ? (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/commandes/${o.id}`} className="block rounded-2xl bg-white p-4 transition hover:ring-2 hover:ring-ink/10">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold">{orderRef(o.number)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span>
                  {o.status === "pending_payment" && o.paymentDueAt && (
                    <span className={`text-xs font-medium ${new Date(o.paymentDueAt).getTime() - now.getTime() < 6 * 3_600_000 ? "text-sale" : "text-muted"}`}>
                      ⏱ {timeLeft(o.paymentDueAt, now)}
                    </span>
                  )}
                  <span className="ml-auto font-semibold">{formatPrice(o.totalCents)}</span>
                </div>
                <p className="mt-1 text-sm">{o.firstName} {o.lastName} <span className="text-muted">· {dateFr(o.createdAt)}</span></p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {o.items.map((i) => `${i.brand} ${i.productName} (${i.size}${i.quantity > 1 ? ` ×${i.quantity}` : ""})`).join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-muted">Aucune commande ici.</div>
      )}
    </div>
  );
}
