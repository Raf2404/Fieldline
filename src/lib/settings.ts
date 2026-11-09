import "server-only";
import { cacheTag } from "next/cache";
import { db, schema } from "@/db";
import { DEFAULT_PAYMENT_DELAY_HOURS } from "./orders";

export const SETTINGS_TAG = "settings";

/** Statuts dont le texte d'e-mail est personnalisable. */
export const EMAIL_TEXT_KEYS = ["pending_payment", "paid", "ordered", "received", "shipped", "delivered", "cancelled", "refunded"] as const;

export type ShopSettings = {
  /** Numéro WhatsApp international sans « + » ; vide tant qu'il n'est pas renseigné. */
  whatsapp: string;
  /** Texte libre affiché après la commande (moyen de paiement…). */
  paymentInfo: string;
  shippingCents: number;
  paymentDelayHours: number;
  /** Délai affiché sur le site et proposé par défaut pour les nouveaux articles. */
  defaultLeadTime: string;
  instagram: string;
  tiktok: string;
  snapchat: string;
  /** Informations légales (mentions légales, CGV, factures). */
  legalName: string;
  legalStatus: string;
  siret: string;
  legalAddress: string;
  contactEmail: string;
  /** Texte personnalisé de l'e-mail de chaque statut (vide = texte par défaut). */
  emailTexts: Partial<Record<(typeof EMAIL_TEXT_KEYS)[number], string>>;
};

const DEFAULTS: ShopSettings = {
  whatsapp: "",
  paymentInfo: "",
  shippingCents: 0,
  paymentDelayHours: DEFAULT_PAYMENT_DELAY_HOURS,
  defaultLeadTime: "2 à 3 semaines",
  instagram: "",
  tiktok: "",
  snapchat: "",
  legalName: "",
  legalStatus: "",
  siret: "",
  legalAddress: "",
  contactEmail: "",
  emailTexts: {},
};

export async function getSettings(): Promise<ShopSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  const rows = await db.select().from(schema.settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const str = (k: keyof ShopSettings) => (map[k] ?? DEFAULTS[k]) as string;
  return {
    whatsapp: str("whatsapp"),
    paymentInfo: str("paymentInfo"),
    shippingCents: map.shippingCents ? Number(map.shippingCents) : DEFAULTS.shippingCents,
    paymentDelayHours: map.paymentDelayHours ? Number(map.paymentDelayHours) : DEFAULTS.paymentDelayHours,
    defaultLeadTime: str("defaultLeadTime") || DEFAULTS.defaultLeadTime,
    instagram: str("instagram"),
    tiktok: str("tiktok"),
    snapchat: str("snapchat"),
    legalName: str("legalName"),
    legalStatus: str("legalStatus"),
    siret: str("siret"),
    legalAddress: str("legalAddress"),
    contactEmail: str("contactEmail"),
    emailTexts: Object.fromEntries(EMAIL_TEXT_KEYS.map((k) => [k, map[`email_${k}`] ?? ""]).filter(([, v]) => v)),
  };
}

export async function saveSettings(values: Partial<ShopSettings>) {
  const now = new Date();
  const { emailTexts, ...rest } = values;
  const entries: [string, string][] = Object.entries(rest).map(([k, v]) => [k, String(v)]);
  if (emailTexts) for (const k of EMAIL_TEXT_KEYS) entries.push([`email_${k}`, emailTexts[k] ?? ""]);
  for (const [key, value] of entries) {
    await db
      .insert(schema.settings)
      .values({ key, value: String(value), updatedAt: now })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: String(value), updatedAt: now } });
  }
}
