import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrintButton } from "@/components/admin/print-button";
import { requireAdmin } from "@/lib/auth";
import { getOrder } from "@/lib/admin-orders";
import { dateFr, formatPhone, orderRef } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Bon de livraison", robots: { index: false } };

export default function SlipPage({ params }: PageProps<"/admin/bon/[id]">) {
  return (
    <Suspense>
      <Slip params={params} />
    </Suspense>
  );
}

async function Slip({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [o, settings] = await Promise.all([getOrder(id), getSettings()]);
  if (!o) notFound();
  return (
    <main className="mx-auto max-w-2xl bg-white p-8 text-ink print:p-0">
      <div className="mb-6 flex justify-end print:hidden"><PrintButton /></div>
      <header className="flex items-start justify-between border-b-2 border-ink pb-4">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold">Field<span className="text-brand">line</span></p>
          {settings.legalName && <p className="text-xs text-muted">{settings.legalName}{settings.siret && ` · SIRET ${settings.siret}`}</p>}
          {settings.legalAddress && <p className="whitespace-pre-line text-xs text-muted">{settings.legalAddress}</p>}
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold">Bon de livraison</h1>
          <p className="text-sm">Commande {orderRef(o.number)}</p>
          <p className="text-xs text-muted">du {dateFr(o.createdAt)}</p>
        </div>
      </header>
      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Livrer à</p>
        <p className="mt-1 text-lg font-semibold">{o.firstName} {o.lastName}</p>
        <p>{o.address1}</p>
        {o.address2 && <p>{o.address2}</p>}
        <p>{o.postalCode} {o.city}</p>
        <p>{o.country}</p>
        <p className="mt-1 text-sm text-muted">{formatPhone(o.phone)}</p>
      </section>
      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="py-2">Article</th><th className="py-2">Pointure</th><th className="py-2 text-right">Quantité</th><th className="py-2 text-right">Vérifié</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id} className="border-b border-line">
              <td className="py-3">{i.brand} {i.productName}</td>
              <td className="py-3 font-bold">{i.size}</td>
              <td className="py-3 text-right">{i.quantity}</td>
              <td className="py-3 text-right">☐</td>
            </tr>
          ))}
        </tbody>
      </table>
      {o.customerNote && <p className="mt-6 rounded-lg border border-line p-3 text-sm"><b>Note du client :</b> {o.customerNote}</p>}
      <p className="mt-10 text-center text-sm text-muted">Merci pour ta commande ! Une question : réponds à notre e-mail de confirmation.</p>
    </main>
  );
}
