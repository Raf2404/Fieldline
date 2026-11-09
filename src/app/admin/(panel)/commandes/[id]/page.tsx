import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WhatsAppIcon } from "@/components/icons";
import { Totals } from "@/components/order-summary";
import { OrderActions, InternalNote } from "@/components/admin/order-actions";
import { requireAdmin } from "@/lib/auth";
import { getOrder } from "@/lib/admin-orders";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS, dateFr, formatPhone, orderRef, timeLeft, whatsappLink } from "@/lib/orders";
import { SITE } from "@/lib/site";
import { imageUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Commande" };

export default async function OrderPage({ params }: PageProps<"/admin/commandes/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const o = await getOrder(id);
  if (!o) notFound();
  const ref = orderRef(o.number);
  const st = ORDER_STATUS[o.status];
  const hello = `Bonjour ${o.firstName}, merci pour ta commande ${ref} sur ${SITE.name} (${formatPrice(o.totalCents)}). `;

  return (
    <div className="space-y-4">
      <Link href="/admin/commandes" className="text-sm text-muted hover:text-ink">← Commandes</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Commande {ref}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${st.tone}`}>{st.label}</span>
        <span className="text-sm text-muted">passée le {dateFr(o.createdAt)}</span>
      </div>

      {o.status === "pending_payment" && o.paymentDueAt && (
        <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">
          En attente du paiement. Annulation automatique dans <b>{timeLeft(o.paymentDueAt)}</b> ({dateFr(o.paymentDueAt)}) si rien n&apos;est validé.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-5">
            <h2 className="mb-3 font-semibold">Articles</h2>
            <ul className="divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-paper">
                    {i.imageKey && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl(i.imageKey, "sm")} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    {i.productId ? (
                      <Link href={`/admin/articles/${i.productId}`} className="font-semibold hover:underline">{i.brand} {i.productName}</Link>
                    ) : (
                      <p className="font-semibold">{i.brand} {i.productName}</p>
                    )}
                    <p className="text-muted">
                      Pointure <b className="text-ink">{i.size}</b> · ×{i.quantity} · {formatPrice(i.unitPriceCents)}
                      {i.reservedQty < i.quantity && <span className="text-warn"> · {i.quantity - i.reservedQty} sur commande</span>}
                    </p>
                  </div>
                  <p className="font-semibold">{formatPrice(i.unitPriceCents * i.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-line pt-3"><Totals subtotal={o.subtotalCents} shipping={o.shippingCents} /></div>
          </section>

          <section className="rounded-2xl bg-white p-5">
            <h2 className="mb-3 font-semibold">Historique</h2>
            <ol className="space-y-3 border-l-2 border-line pl-4 text-sm">
              {o.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-ink" />
                  <p>{e.message}</p>
                  <p className="text-xs text-muted">{dateFr(e.createdAt)} · {e.actor}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="order-first space-y-4 lg:order-none">
          <OrderActions orderId={o.id} status={o.status} />

          <section className="space-y-2 rounded-2xl bg-white p-5 text-sm">
            <h2 className="font-semibold">Client</h2>
            <p className="font-medium">{o.firstName} {o.lastName}</p>
            <p><a href={`mailto:${o.email}`} className="underline">{o.email}</a></p>
            <p><a href={`tel:+${o.phone}`} className="underline">{formatPhone(o.phone)}</a></p>
            <a href={whatsappLink(o.phone, hello)} target="_blank" rel="noopener" className="btn mt-1 w-full bg-[#25D366] text-white hover:bg-[#1ebe5b]">
              <WhatsAppIcon className="size-5" /> Écrire sur WhatsApp
            </a>
            <div className="border-t border-line pt-2 text-muted">
              <p className="font-medium text-ink">Livraison</p>
              <p>{o.address1}</p>
              {o.address2 && <p>{o.address2}</p>}
              <p>{o.postalCode} {o.city}, {o.country}</p>
            </div>
            {o.customerNote && (
              <div className="rounded-xl bg-accent/30 p-3">
                <p className="font-medium">Message du client</p>
                <p className="whitespace-pre-line">{o.customerNote}</p>
              </div>
            )}
          </section>

          <InternalNote orderId={o.id} initial={o.internalNote ?? ""} />
        </div>
      </div>
    </div>
  );
}
