import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WhatsAppIcon } from "@/components/icons";
import { Totals } from "@/components/order-summary";
import { formatPrice } from "@/lib/money";
import { getOrderByToken } from "@/lib/order-service";
import { ORDER_STATUS, dateFr, orderRef, whatsappLink } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";
import { imageUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Commande enregistrée", robots: { index: false } };

export default function ThankYouPage({ params }: PageProps<"/commande/merci/[token]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-black/5" />}>
        <Confirmation params={params} />
      </Suspense>
    </div>
  );
}

async function Confirmation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [order, settings] = await Promise.all([getOrderByToken(token), getSettings()]);
  if (!order) notFound();

  const ref = orderRef(order.number);
  const message = [
    `Bonjour, je viens de passer la commande ${ref} sur ${SITE.name} :`,
    ...order.items.map((i) => `- ${i.brand} ${i.productName}, pointure ${i.size}${i.quantity > 1 ? ` (x${i.quantity})` : ""}`),
    `Total : ${formatPrice(order.totalCents)}`,
    `Nom : ${order.firstName} ${order.lastName}`,
    "Comment puis-je régler ?",
  ].join("\n");
  const pending = order.status === "pending_payment";

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-ink p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">
          {pending ? "Commande réservée" : ORDER_STATUS[order.status].label}
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase leading-none">Commande {ref}</h1>
        {pending && order.paymentDueAt && (
          <p className="mt-3 text-white/75">
            Ta paire est réservée jusqu&apos;au <b className="text-white">{dateFr(order.paymentDueAt)}</b>. Sans paiement d&apos;ici là,
            la commande est annulée automatiquement.
          </p>
        )}
      </div>

      {pending && (
        <section className="space-y-4 rounded-2xl border-2 border-ink bg-white p-5">
          <h2 className="text-lg font-bold">Dernière étape : le paiement</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-[15px]">
            <li>Envoie-nous ton numéro de commande <b>{ref}</b> sur WhatsApp (le message est déjà prêt).</li>
            <li>On te répond avec les instructions de paiement.</li>
            <li>Dès réception, ta commande passe en « Payée » et tu reçois une confirmation.</li>
          </ol>
          {settings.paymentInfo && <p className="whitespace-pre-line rounded-xl bg-paper p-3 text-sm">{settings.paymentInfo}</p>}
          {settings.whatsapp ? (
            <a
              href={whatsappLink(settings.whatsapp, message)}
              target="_blank"
              rel="noopener"
              className="btn w-full bg-[#25D366] py-4 text-base text-white hover:bg-[#1ebe5b]"
            >
              <WhatsAppIcon /> Envoyer ma commande sur WhatsApp
            </a>
          ) : (
            <p className="rounded-xl bg-paper p-3 text-sm">
              Contacte-nous en indiquant ton numéro de commande <b>{ref}</b> via la page <Link href="/contact" className="underline">contact</Link>.
            </p>
          )}
          <p className="text-xs text-muted">Garde bien cette page : son adresse te permet de revoir ta commande à tout moment.</p>
        </section>
      )}

      <section className="space-y-4 rounded-2xl bg-white p-5">
        <h2 className="font-semibold">Récapitulatif</h2>
        <ul className="space-y-3">
          {order.items.map((i) => (
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
        <Totals subtotal={order.subtotalCents} shipping={order.shippingCents} />
        <div className="border-t border-line pt-3 text-sm text-muted">
          <p className="font-medium text-ink">Livraison</p>
          <p>{order.firstName} {order.lastName}</p>
          <p>{order.address1}{order.address2 ? `, ${order.address2}` : ""}</p>
          <p>{order.postalCode} {order.city}</p>
        </div>
      </section>
      <Link href="/catalogue" className="inline-block text-sm font-semibold underline underline-offset-4">Continuer mes achats</Link>
    </div>
  );
}
