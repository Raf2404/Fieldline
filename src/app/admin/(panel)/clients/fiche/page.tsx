import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WhatsAppIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";
import { getCustomerFile } from "@/lib/admin-orders";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS, dateFr, formatPhone, orderRef, whatsappLink } from "@/lib/orders";

export const metadata: Metadata = { title: "Fiche client" };

export default async function CustomerFilePage({ searchParams }: PageProps<"/admin/clients/fiche">) {
  await requireAdmin();
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email.toLowerCase() : "";
  const f = email ? await getCustomerFile(email) : null;
  if (!f) notFound();
  const last = f.orders[0];
  const spent = f.orders.filter((o) => ["paid", "ordered", "received", "shipped", "delivered"].includes(o.status)).reduce((n, o) => n + o.totalCents, 0);
  return (
    <div className="space-y-4">
      <Link href="/admin/clients" className="text-sm text-muted hover:text-ink">← Clients</Link>
      <h1 className="text-2xl font-bold">{last.firstName} {last.lastName}</h1>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-5">
            <h2 className="mb-3 font-semibold">Commandes ({f.orders.length}) · {formatPrice(spent)} payés</h2>
            <ul className="divide-y divide-line">
              {f.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/commandes/${o.id}`} className="flex flex-wrap items-center gap-3 py-2.5 text-sm hover:underline">
                    <b>{orderRef(o.number)}</b>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span>
                    <span className="flex-1 truncate text-muted">{f.items.filter((i) => i.orderId === o.id).map((i) => `${i.brand} ${i.productName} (${i.size})`).join(" · ")}</span>
                    <span>{formatPrice(o.totalCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {f.requests.length > 0 && (
            <section className="rounded-2xl bg-white p-5">
              <h2 className="mb-3 font-semibold">Demandes envoyées</h2>
              <ul className="space-y-2 text-sm">
                {f.requests.map((r) => (
                  <li key={r.id} className={`rounded-xl p-3 ${r.handledAt ? "bg-paper text-muted" : "bg-warn/10"}`}>
                    <b>{r.type === "retour" ? "Retour" : "Problème"}</b> · {dateFr(r.createdAt)} {r.handledAt ? "· traitée" : "· à traiter"}
                    <p className="mt-1 whitespace-pre-line">{r.message}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <section className="space-y-2 rounded-2xl bg-white p-5 text-sm">
          <h2 className="font-semibold">Coordonnées</h2>
          <p><a href={`mailto:${email}`} className="underline">{email}</a></p>
          <p>{formatPhone(last.phone)}</p>
          <p className="text-muted">{last.address1}{last.address2 ? `, ${last.address2}` : ""}<br />{last.postalCode} {last.city}</p>
          <p className="text-xs text-muted">{f.account ? `Espace client créé le ${dateFr(f.account.createdAt)}` : "Pas d'espace client"}</p>
          <a href={whatsappLink(last.phone, `Bonjour ${last.firstName}, `)} target="_blank" rel="noopener" className="btn mt-2 w-full bg-[#25D366] text-white hover:bg-[#1ebe5b]">
            <WhatsAppIcon className="size-5" /> WhatsApp
          </a>
        </section>
      </div>
    </div>
  );
}
