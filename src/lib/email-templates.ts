import "server-only";
import type { Order, OrderItem } from "@/db/schema";
import { formatPrice } from "./money";
import { ORDER_STATUS, carrierLabel, dateFr, dayFr, orderRef, trackingUrl, whatsappLink } from "./orders";
import { SITE } from "./site";

// Modèles d'e-mails : HTML en tableaux et styles en ligne (compatibles Gmail, Outlook, Apple Mail).

const C = { ink: "#202a33", brand: "#06afea", accent: "#a1ff2a", muted: "#66707a", line: "#e2e5e9", paper: "#f6f7f8" };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function button(label: string, href: string, color = C.ink, text = "#ffffff") {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-radius:999px;background:${color}">
    <a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font:600 15px/1 Arial,sans-serif;color:${text};text-decoration:none;border-radius:999px">${esc(label)}</a>
  </td></tr></table>`;
}

function layout(title: string, body: string, preheader: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:${C.paper}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="background:${C.ink};border-radius:16px 16px 0 0;padding:22px 28px">
      <img src="${SITE.url}/brand/fieldline-logo.png" width="110" alt="Fieldline" style="display:block;border:0">
    </td></tr>
    <tr><td style="height:5px;background:linear-gradient(90deg,${C.brand} 0 25%,#ffffff 25% 50%,#ff6b21 50% 75%,${C.accent} 75%);background-color:${C.brand}"></td></tr>
    <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;padding:28px;font:15px/1.6 Arial,sans-serif;color:${C.ink}">
      <h1 style="margin:0 0 16px;font:800 22px/1.25 Arial,sans-serif;color:${C.ink}">${esc(title)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:18px 8px;font:12px/1.5 Arial,sans-serif;color:${C.muted};text-align:center">
      ${esc(SITE.name)} · ${esc(SITE.tagline)}<br>Une question ? Réponds simplement à cet e-mail.
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 14px">${html}</p>`;

function itemsTable(order: Order, items: OrderItem[]) {
  const rows = items
    .map(
      (i) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${C.line}">${esc(`${i.brand} ${i.productName}`)}<br><span style="color:${C.muted};font-size:13px">Pointure ${esc(i.size)}${i.quantity > 1 ? ` · ×${i.quantity}` : ""}</span></td>
      <td style="padding:8px 0;border-bottom:1px solid ${C.line};text-align:right;white-space:nowrap">${formatPrice(i.unitPriceCents * i.quantity)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;font-size:14px">${rows}
    <tr><td style="padding:8px 0;color:${C.muted}">Livraison</td><td style="padding:8px 0;text-align:right">${order.shippingCents ? formatPrice(order.shippingCents) : "Offerte"}</td></tr>
    <tr><td style="padding:8px 0;font-weight:700">Total</td><td style="padding:8px 0;text-align:right;font-weight:700">${formatPrice(order.totalCents)}</td></tr>
  </table>`;
}

export const orderUrl = (o: Order) => `${SITE.url}/commande/${o.token}`;

type Ctx = { order: Order; items: OrderItem[]; whatsapp?: string; message?: string | null };

/** E-mail envoyé au client pour chaque statut (ou null si aucun e-mail pour ce statut). */
export function statusEmail(status: string, { order, items, whatsapp, message }: Ctx) {
  const ref = orderRef(order.number);
  const hi = p(`Bonjour ${esc(order.firstName)},`);
  const extra = message ? `<div style="margin:0 0 14px;padding:14px;border-radius:12px;background:${C.paper}">${esc(message).replace(/\n/g, "<br>")}</div>` : "";
  const follow = button("Suivre ma commande", orderUrl(order));
  const eta = order.estimatedDeliveryAt ? `Livraison estimée : <b>${esc(dayFr(order.estimatedDeliveryAt))}</b>.` : "";

  switch (status) {
    case "pending_payment": {
      const wa = whatsapp
        ? button("Envoyer ma commande sur WhatsApp", whatsappLink(whatsapp, `Bonjour, je viens de passer la commande ${ref} sur ${SITE.name}. Comment puis-je régler ?`), "#25D366")
        : "";
      return {
        subject: `Commande ${ref} réservée : dernière étape, le paiement`,
        html: layout(`Ta commande ${ref} est réservée`, `${hi}
          ${p(`Merci ! Ta paire est mise de côté${order.paymentDueAt ? ` jusqu'au <b>${esc(dateFr(order.paymentDueAt))}</b>` : ""}.`)}
          ${p(`<b>Dernière étape :</b> envoie-nous ton numéro de commande <b>${ref}</b> sur WhatsApp, on te donne les instructions pour régler. Sans paiement dans ce délai, la commande est annulée automatiquement.`)}
          ${wa}${itemsTable(order, items)}${follow}`, `Envoie-nous ${ref} sur WhatsApp pour régler.`),
      };
    }
    case "paid":
      return {
        subject: `Paiement reçu : commande ${ref} confirmée`,
        html: layout("Paiement reçu, c'est confirmé !", `${hi}
          ${p(`Nous avons bien reçu ton paiement pour la commande <b>${ref}</b>. On commande ta paire tout de suite.`)}
          ${p(`${eta} Tu recevras un e-mail à chaque étape.`)}${extra}${itemsTable(order, items)}${follow}`, "Ta commande est confirmée."),
      };
    case "ordered":
      return {
        subject: `Ta paire est commandée (${ref})`,
        html: layout("Ta paire est commandée", `${hi}${p(`Bonne nouvelle : ta paire est commandée auprès de notre fournisseur. ${eta}`)}${extra}${follow}`, "Ta paire est en route vers nous."),
      };
    case "received":
      return {
        subject: `Ta paire est arrivée chez nous (${ref})`,
        html: layout("Ta paire est arrivée chez nous", `${hi}${p("Ta paire vient d'arriver chez nous. On la prépare et l'expédition est imminente.")}${extra}${follow}`, "Expédition imminente."),
      };
    case "shipped": {
      const url = trackingUrl(order.carrier, order.trackingNumber);
      return {
        subject: `Ta commande ${ref} est expédiée`,
        html: layout("Ta commande est en route !", `${hi}${p("Ta paire est expédiée.")}
          ${order.trackingNumber ? p(`Transporteur : <b>${esc(carrierLabel(order.carrier))}</b><br>Numéro de suivi : <b>${esc(order.trackingNumber)}</b>`) : ""}
          ${extra}${url ? button("Suivre mon colis", url, C.brand) : follow}`, "Ton colis est en route."),
      };
    }
    case "delivered":
      return {
        subject: `Livrée ! Merci pour ta commande ${ref}`,
        html: layout("Bon match avec tes nouveaux crampons !", `${hi}${p(`Ta commande <b>${ref}</b> est livrée. Merci de ta confiance !`)}
          ${p("Ton avis nous aide beaucoup : réponds simplement à cet e-mail pour nous dire ce que tu en penses.")}${extra}`, "Merci pour ta commande."),
      };
    case "cancelled":
      return {
        subject: `Commande ${ref} annulée`,
        html: layout("Ta commande est annulée", `${hi}${p(`Ta commande <b>${ref}</b> est annulée${order.paidAt ? "" : " (paiement non reçu dans le délai)"}. Les paires réservées sont remises en vente.`)}
          ${extra}${p("Tu peux repasser commande à tout moment sur le site.")}${button("Voir le catalogue", `${SITE.url}/catalogue`)}`, "Ta commande est annulée."),
      };
    case "refunded":
      return {
        subject: `Remboursement de ta commande ${ref}`,
        html: layout("Remboursement effectué", `${hi}${p(`Le remboursement de ta commande <b>${ref}</b> (${formatPrice(order.totalCents)}) a été effectué.`)}${extra}`, "Ton remboursement est effectué."),
      };
    default:
      return null;
  }
}

export function delayEmail(order: Order, newDate: Date, message: string) {
  const ref = orderRef(order.number);
  return {
    subject: `Petit retard sur ta commande ${ref}`,
    html: layout("Ta commande a un peu de retard", `${p(`Bonjour ${esc(order.firstName)},`)}
      ${p(`Désolé, ta commande <b>${ref}</b> prend un peu plus de temps que prévu. Nouvelle date de livraison estimée : <b>${esc(dayFr(newDate))}</b>.`)}
      ${message ? `<div style="margin:0 0 14px;padding:14px;border-radius:12px;background:${C.paper}">${esc(message).replace(/\n/g, "<br>")}</div>` : ""}
      ${p("Merci pour ta patience !")}${button("Suivre ma commande", orderUrl(order))}`, "Nouvelle date de livraison."),
  };
}

export function adminNewOrderEmail(order: Order, items: OrderItem[]) {
  const ref = orderRef(order.number);
  return {
    subject: `Nouvelle commande ${ref} · ${formatPrice(order.totalCents)}`,
    html: layout(`Nouvelle commande ${ref}`, `${p(`<b>${esc(order.firstName)} ${esc(order.lastName)}</b> vient de commander. Paiement à recevoir sur WhatsApp.`)}
      ${itemsTable(order, items)}${button("Ouvrir la commande", `${SITE.url}/admin/commandes/${order.id}`)}`, "Nouvelle commande en attente de paiement."),
  };
}

export function adminRequestEmail(order: Order, type: string, message: string) {
  const ref = orderRef(order.number);
  const label = type === "retour" ? "Demande de retour" : "Problème signalé";
  return {
    subject: `${label} · commande ${ref}`,
    html: layout(`${label} : ${ref}`, `${p(`<b>${esc(order.firstName)} ${esc(order.lastName)}</b> (${esc(order.email)}) a écrit :`)}
      <div style="margin:0 0 14px;padding:14px;border-radius:12px;background:${C.paper}">${esc(message).replace(/\n/g, "<br>")}</div>
      ${button("Ouvrir la commande", `${SITE.url}/admin/commandes/${order.id}`)}`, label),
  };
}

export function loginEmail(link: string) {
  return {
    subject: `Ton lien de connexion ${SITE.name}`,
    html: layout("Connexion à ton espace", `${p("Clique sur le bouton pour accéder à ton espace client. Ce lien est valable 30 minutes et ne fonctionne qu'une fois.")}
      ${button("Me connecter", link, C.brand)}${p(`<span style="color:${C.muted};font-size:13px">Si tu n'as rien demandé, ignore simplement cet e-mail.</span>`)}`, "Ton lien de connexion."),
  };
}

export const statusLabel = (s: string) => ORDER_STATUS[s as keyof typeof ORDER_STATUS]?.label ?? s;
