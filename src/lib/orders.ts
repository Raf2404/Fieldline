// Règles des commandes partagées entre le site, l'admin et les e-mails (sans accès base).

export const ORDER_STATUS = {
  pending_payment: { label: "En attente de paiement", tone: "bg-warn/15 text-warn" },
  paid: { label: "Payée", tone: "bg-ok/15 text-ok" },
  ordered: { label: "Commandée au fournisseur", tone: "bg-sky-100 text-sky-800" },
  received: { label: "Reçue, en préparation", tone: "bg-indigo-100 text-indigo-800" },
  shipped: { label: "Expédiée", tone: "bg-violet-100 text-violet-800" },
  delivered: { label: "Livrée", tone: "bg-ink text-white" },
  cancelled: { label: "Annulée", tone: "bg-black/5 text-muted" },
  refunded: { label: "Remboursée", tone: "bg-black/5 text-muted" },
} as const;
export type OrderStatusCode = keyof typeof ORDER_STATUS;

/** Parcours normal d'une commande, dans l'ordre. */
export const ORDER_FLOW: OrderStatusCode[] = ["pending_payment", "paid", "ordered", "received", "shipped", "delivered"];

export const DEFAULT_PAYMENT_DELAY_HOURS = 48;
export const MAX_QTY_PER_LINE = 5;
export const MAX_PENDING_PER_CUSTOMER = 2;

export const orderRef = (n: number) => `N° ${n}`;

/**
 * Numéro de téléphone → format international sans « + » (ex. 33612345678).
 * Accepte « 06 12 34 56 78 », « +33 6 12… », « 0033 6… ». Renvoie null si invalide.
 */
export function normalizePhone(input: string, defaultCountry = "33"): string | null {
  const raw = input.trim();
  let digits = raw.replace(/[^\d]/g, "");
  if (raw.startsWith("+")) {
    // déjà international
  } else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 10) digits = defaultCountry + digits.slice(1);
  if (digits.length < 9 || digits.length > 15) return null;
  return digits;
}

export function formatPhone(intl: string) {
  if (intl.startsWith("33") && intl.length === 11) return "0" + intl.slice(2).replace(/(\d)(?=(\d{2})+$)/g, "$1 ");
  return "+" + intl;
}

export const whatsappLink = (intlNumber: string, text: string) =>
  `https://wa.me/${intlNumber}?text=${encodeURIComponent(text)}`;

export function timeLeft(due: Date | string, now = new Date()) {
  const ms = new Date(due).getTime() - now.getTime();
  if (ms <= 0) return "délai dépassé";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h >= 1 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

export const dateFr = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(d));
