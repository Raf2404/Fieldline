import "server-only";
import { cacheTag } from "next/cache";
import { db, schema } from "@/db";
import { DEFAULT_PAYMENT_DELAY_HOURS } from "./orders";

export const SETTINGS_TAG = "settings";

export type ShopSettings = {
  /** Numéro WhatsApp international sans « + » ; vide tant qu'il n'est pas renseigné. */
  whatsapp: string;
  /** Texte libre affiché après la commande (moyen de paiement…). */
  paymentInfo: string;
  shippingCents: number;
  paymentDelayHours: number;
};

const DEFAULTS: ShopSettings = {
  whatsapp: "",
  paymentInfo: "",
  shippingCents: 0,
  paymentDelayHours: DEFAULT_PAYMENT_DELAY_HOURS,
};

export async function getSettings(): Promise<ShopSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  const rows = await db.select().from(schema.settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    whatsapp: map.whatsapp ?? DEFAULTS.whatsapp,
    paymentInfo: map.paymentInfo ?? DEFAULTS.paymentInfo,
    shippingCents: map.shippingCents ? Number(map.shippingCents) : DEFAULTS.shippingCents,
    paymentDelayHours: map.paymentDelayHours ? Number(map.paymentDelayHours) : DEFAULTS.paymentDelayHours,
  };
}

export async function saveSettings(values: ShopSettings) {
  const now = new Date();
  for (const [key, value] of Object.entries(values)) {
    await db
      .insert(schema.settings)
      .values({ key, value: String(value), updatedAt: now })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: String(value), updatedAt: now } });
  }
}
