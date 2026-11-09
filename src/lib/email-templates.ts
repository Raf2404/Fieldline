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
    ${order.discountCents ? `<tr><td style="padding:8px 0;color:#1f8a4c">Code ${esc(order.promoCode ?? "")}</td><td style="padding:8px 0;text-align:right;color:#1f8a4c">-${formatPrice(order.discountCents)}</td></tr>` : ""}
    <tr><td style="padding:8px 0;color:${C.muted}">Livraison</td><td style="padding:8px 0;text-align:right">${order.shippingCents ? formatPrice(order.shippingCents) : "Offerte"}</td></tr>
    <tr><td style="padding:8px 0;font-weight:700">Total</td><td style="padding:8px 0;text-align:right;font-weight:700">${formatPrice(order.totalCents)}</td></tr>
  </table>`;
}

export const orderUrl = (o: Order) => `${SITE.url}/commande/${o.token}`;

type Ctx = { order: Order; items: OrderItem[]; whatsapp?: string; message?: string | null; custom?: string | null };

/**
 * Texte principal de chaque e-mail de statut, modifiable dans Admin > Réglages.
 * Variables : {prenom}, {commande}, {total}, {date_livraison}.
 */
export const DEFAULT_EMAIL_TEXTS: Record<string, { subject: string; title: string; text: string }> = {
  pending_payment: {
    subject: "Commande {commande} réservée : dernière étape, le paiement",
    title: "Ta commande {commande} est réservée",
    text: "Merci ! Ta paire est mise de côté.\n\nDernière étape : envoie-nous ton numéro de commande {commande} sur WhatsApp, on te donne les instructions pour régler. Sans paiement dans le délai indiqué, la commande est annulée automatiquement.",
  },
  paid: {
    subject: "Paiement reçu : commande {commande} confirmée",
    title: "Paiement reçu, c'est confirmé !",
    text: "Nous avons bien reçu ton paiement pour la commande {commande}. On commande ta paire tout de suite.\n\nLivraison estimée : {date_livraison}. Tu recevras un e-mail à chaque étape.",
  },
  ordered: { subject: "Ta paire est commandée ({commande})", title: "Ta paire est commandée", text: "Bonne nouvelle : ta paire est commandée auprès de notre fournisseur. Livraison estimée : {date_livraison}." },
  received: { subject: "Ta paire est arrivée chez nous ({commande})", title: "Ta paire est arrivée chez nous", text: "Ta paire vient d'arriver chez nous. On la prépare et l'expédition est imminente." },
  shipped: { subject: "Ta commande {commande} est expédiée", title: "Ta commande est en route !", text: "Ta paire est expédiée. Tu peux suivre ton colis avec le lien ci-dessous." },
  delivered: {
    subject: "Livrée ! Merci pour ta commande {commande}",
    title: "Bon match avec tes nouveaux crampons !",
    text: "Ta commande {commande} est livrée. Merci de ta confiance !\n\nTon avis nous aide beaucoup : réponds simplement à cet e-mail pour nous dire ce que tu en penses.",
  },
  cancelled: {
    subject: "Commande {commande} annulée",
    title: "Ta commande est annulée",
    text: "Ta commande {commande} est annulée. Les paires réservées sont remises en vente. Tu peux repasser commande à tout moment sur le site.",
  },
  refunded: { subject: "Remboursement de ta commande {commande}", title: "Remboursement effectué", text: "Le remboursement de ta commande {commande} ({total}) a été effectué." },
};

function fill(t: string, order: Order) {
  return t
    .replaceAll("{prenom}", order.firstName)
    .replaceAll("{commande}", orderRef(order.number))
    .replaceAll("{total}", formatPrice(order.totalCents))
    .replaceAll("{date_livraison}", order.estimatedDeliveryAt ? dayFr(order.estimatedDeliveryAt) : "2 à 3 semaines après le paiement");
}

const paragraphs = (t: string) =>
  t
    .split(/\n{2,}/)
    .map((para) => p(esc(para).replace(/\n/g, "<br>")))
    .join("");

/** E-mail envoyé au client pour chaque statut (ou null si aucun e-mail pour ce statut). */
export function statusEmail(status: string, { order, items, whatsapp, message, custom }: Ctx) {
  const def = DEFAULT_EMAIL_TEXTS[status];
  if (!def) return null;
  const ref = orderRef(order.number);
  const body = paragraphs(fill(custom?.trim() || def.text, order));
  const extra = message ? `<div style="margin:0 0 14px;padding:14px;border-radius:12px;background:${C.paper}">${esc(message).replace(/\n/g, "<br>")}</div>` : "";
  const follow = button("Suivre ma commande", orderUrl(order));
  let after = follow;
  if (status === "pending_payment") {
    const wa = whatsapp
      ? button("Envoyer ma commande sur WhatsApp", whatsappLink(whatsapp, `Bonjour, je viens de passer la commande ${ref} sur ${SITE.name}. Comment puis-je régler ?`), "#25D366")
      : "";
    const due = order.paymentDueAt ? p(`Paire réservée jusqu'au <b>${esc(dateFr(order.paymentDueAt))}</b>.`) : "";
    after = `${due}${wa}${itemsTable(order, items)}${follow}`;
  } else if (status === "paid") {
    after = `${itemsTable(order, items)}${follow}`;
  } else if (status === "shipped") {
    const url = trackingUrl(order.carrier, order.trackingNumber);
    const info = order.trackingNumber ? p(`Transporteur : <b>${esc(carrierLabel(order.carrier))}</b><br>Numéro de suivi : <b>${esc(order.trackingNumber)}</b>`) : "";
    after = `${info}${url ? button("Suivre mon colis", url, C.brand) : follow}`;
  } else if (status === "delivered" || status === "refunded") {
    after = "";
  } else if (status === "cancelled") {
    after = button("Voir le catalogue", `${SITE.url}/catalogue`);
  }
  return {
    subject: fill(def.subject, order),
    html: layout(fill(def.title, order), `${p(`Bonjour ${esc(order.firstName)},`)}${body}${extra}${after}`, fill(def.title, order)),
  };
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
