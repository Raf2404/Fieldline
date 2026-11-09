import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { AccountLinkButton } from "@/components/account-link-button";
import { WhatsAppIcon, TruckIcon } from "@/components/icons";
import { OrderRequest } from "@/components/order-request";
import { OrderTimeline } from "@/components/order-timeline";
import { Totals } from "@/components/order-summary";
import { getCustomer } from "@/lib/customer-auth";
import { formatPrice } from "@/lib/money";
import {
  ORDER_STATUS,
  carrierLabel,
  dateFr,
  dayFr,
  orderRef,
  trackingUrl,
  whatsappLink,
  type OrderStatusCode,
} from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";
import { imageUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Ma commande", robots: { index: false } };

export default function OrderPage({ params, searchParams }: PageProps<"/commande/[token]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-black/5" />}>
        <OrderView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrderView({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  if (!/^[\w-]{10,64}$/.test(token)) notFound();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.token, token));
  if (!order) notFound();
  const [items, events, requests, settings, customer] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)),
    db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, order.id)).orderBy(asc(schema.orderEvents.createdAt)),
    db.select().from(schema.customerRequests).where(eq(schema.customerRequests.orderId, order.id)),
    getSettings(),
    getCustomer(),
  ]);

  const ref = orderRef(order.number);
  const status = order.status as OrderStatusCode;
  const pending = status === "pending_payment";
  const closed = status === "cancelled" || status === "refunded";
  const isNew = Boolean(sp.nouvelle);
  const dates: Partial<Record<OrderStatusCode, Date>> = { pending_payment: order.createdAt };
  for (const e of events) if (e.status && !dates[e.status]) dates[e.status] = e.createdAt;
  const track = trackingUrl(order.carrier, order.trackingNumber);
  const openRequests = requests.filter((r) => !r.handledAt);
  const message = [
    `Bonjour, je viens de passer la commande ${ref} sur ${SITE.name} :`,
    ...items.map((i) => `- ${i.brand} ${i.productName}, pointure ${i.size}${i.quantity > 1 ? ` (x${i.quantity})` : ""}`),
    `Total : ${formatPrice(order.totalCents)}`,
    `Nom : ${order.firstName} ${order.lastName}`,
    "Comment puis-je régler ?",
  ].join("\n");

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white">
        <div className="stripes pointer-events-none absolute -right-10 top-0 h-full w-1/2 opacity-30 [mask-image:linear-gradient(to_left,black,transparent)]" />
        <p className="relative text-sm font-semibold uppercase tracking-widest text-accent">
          {pending ? (isNew ? "Commande réservée" : "En attente de paiement") : ORDER_STATUS[status].label}
        </p>
        <h1 className="relative mt-2 text-3xl font-extrabold uppercase leading-none">Commande {ref}</h1>
        {pending && order.paymentDueAt && (
          <p className="relative mt-3 text-white/75">
            Ta paire est réservée jusqu&apos;au <b className="text-white">{dateFr(order.paymentDueAt)}</b>. Sans paiement d&apos;ici là,
            la commande est annulée automatiquement.
          </p>
        )}
        {!pending && !closed && order.estimatedDeliveryAt && status !== "delivered" && (
          <p className="relative mt-3 text-white/75">
            Livraison estimée : <b className="text-white">{dayFr(order.estimatedDeliveryAt)}</b>
          </p>
        )}
      </div>

      {pending && (
        <section className="space-y-4 rounded-2xl border-2 border-ink bg-white p-5">
          <h2 className="text-lg font-bold">Dernière étape : le paiement</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-[15px]">
            <li>Envoie-nous ton numéro de commande <b>{ref}</b> sur WhatsApp (le message est déjà prêt).</li>
            <li>On te répond avec les instructions de paiement.</li>
            <li>Dès réception, ta commande passe en « Payée » et tu reçois une confirmation par e-mail.</li>
          </ol>
          {settings.paymentInfo && <p className="whitespace-pre-line rounded-xl bg-paper p-3 text-sm">{settings.paymentInfo}</p>}
          {settings.whatsapp ? (
            <a href={whatsappLink(settings.whatsapp, message)} target="_blank" rel="noopener" className="btn w-full bg-[#25D366] py-4 text-base text-white hover:bg-[#1ebe5b]">
              <WhatsAppIcon /> Envoyer ma commande sur WhatsApp
            </a>
          ) : (
            <p className="rounded-xl bg-paper p-3 text-sm">
              Contacte-nous en indiquant ton numéro de commande <b>{ref}</b> via la page <Link href="/contact" className="underline">contact</Link>.
            </p>
          )}
          <p className="text-xs text-muted">Un e-mail récapitulatif t&apos;a été envoyé à {order.email}. Garde cette page : son adresse te permet de suivre ta commande.</p>
        </section>
      )}

      {closed && (
        <p className="rounded-2xl bg-white p-5 text-sm">
          Cette commande est {status === "cancelled" ? "annulée" : "remboursée"}. Une question ? <Link href="/contact" className="underline">Contacte-nous</Link>.
        </p>
      )}

      {order.customerMessage && (
        <section className="rounded-2xl bg-accent/30 p-5">
          <p className="text-sm font-semibold">Message de {SITE.name}</p>
          <p className="mt-1 whitespace-pre-line text-[15px]">{order.customerMessage}</p>
        </section>
      )}

      {order.trackingNumber && (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-5">
          <TruckIcon className="text-brand" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">{carrierLabel(order.carrier)}</p>
            <p className="text-muted">N° de suivi : {order.trackingNumber}</p>
          </div>
          {track && <a href={track} target="_blank" rel="noopener" className="btn btn-sm bg-brand text-white hover:bg-brand/90">Suivre mon colis</a>}
        </section>
      )}

      {!closed && (
        <section className="rounded-2xl bg-white p-5">
          <h2 className="mb-4 font-semibold">Suivi</h2>
          <OrderTimeline status={status} dates={dates} />
        </section>
      )}

      <section className="space-y-4 rounded-2xl bg-white p-5">
        <h2 className="font-semibold">Récapitulatif</h2>
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 text-sm">
              <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-paper">
                {i.imageKey && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl(i.imageKey, "sm")} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{i.brand} {i.productName}</p>
                <p className="text-muted">Pointure {i.size}{i.quantity > 1 ? ` · ×${i.quantity}` : ""}</p>
              </div>
              <p>{formatPrice(i.unitPriceCents * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <Totals subtotal={order.subtotalCents} shipping={order.shippingCents} discount={order.discountCents} code={order.promoCode} />
        <div className="border-t border-line pt-3 text-sm text-muted">
          <p className="font-medium text-ink">Livraison</p>
          <p>{order.firstName} {order.lastName}</p>
          <p>{order.address1}{order.address2 ? `, ${order.address2}` : ""}</p>
          <p>{order.postalCode} {order.city}</p>
        </div>
      </section>

      {!pending && status !== "cancelled" && (
        <section className="space-y-3 rounded-2xl bg-white p-5">
          <h2 className="font-semibold">Besoin d&apos;aide ?</h2>
          {openRequests.length > 0 && (
            <ul className="space-y-1 text-sm text-muted">
              {openRequests.map((r) => (
                <li key={r.id}>• {r.type === "retour" ? "Demande de retour" : "Problème signalé"} le {dateFr(r.createdAt)} : en cours de traitement</li>
              ))}
            </ul>
          )}
          <OrderRequest token={token} canReturn={status === "delivered"} />
        </section>
      )}

      {customer?.email !== order.email && (
        <section className="space-y-2 rounded-2xl border border-dashed border-line p-5">
          <p className="text-sm font-semibold">Retrouve toutes tes commandes au même endroit</p>
          <p className="text-sm text-muted">Pas de mot de passe : on t&apos;envoie un lien de connexion par e-mail.</p>
          <AccountLinkButton token={token} email={order.email} />
        </section>
      )}

      <Link href="/catalogue" className="inline-block text-sm font-semibold underline underline-offset-4">Continuer mes achats</Link>
    </div>
  );
}
