import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listCustomers } from "@/lib/admin-orders";
import { formatPrice } from "@/lib/money";
import { dateFr, formatPhone } from "@/lib/orders";

export const metadata: Metadata = { title: "Clients" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/clients">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const rows = await listCustomers(q);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Clients <span className="text-base font-normal text-muted">({rows.length})</span></h1>
      <Form action="/admin/clients" className="flex gap-2">
        <input name="q" type="search" defaultValue={q} placeholder="Nom ou e-mail…" className="input max-w-sm py-2" />
        <button className="btn-secondary btn-sm">Rechercher</button>
      </Form>
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.email}>
              <Link href={`/admin/clients/fiche?email=${encodeURIComponent(c.email)}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white p-4 hover:ring-2 hover:ring-ink/10">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name} {c.hasAccount && <span className="ml-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">compte</span>}</p>
                  <p className="truncate text-sm text-muted">{c.email} · {formatPhone(c.phone)}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{formatPrice(c.spent)}</p>
                  <p className="text-xs text-muted">{c.orders} commande{c.orders > 1 ? "s" : ""} · dernière le {dateFr(c.last)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">Aucun client.</p>
      )}
    </div>
  );
}
