"use server";

import { refresh, updateTag } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { parseEuros } from "@/lib/money";
import { normalizePhone } from "@/lib/orders";
import { EMAIL_TEXT_KEYS, SETTINGS_TAG, saveSettings } from "@/lib/settings";

export type SettingsState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

const str = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);
const url = (v: string) => (!v || /^https:\/\/[^\s]+$/.test(v) ? v : null);

export async function saveShopSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireOwner();
  const errors: Record<string, string> = {};
  const rawPhone = str(formData, "whatsapp");
  const whatsapp = rawPhone ? normalizePhone(rawPhone) : "";
  if (whatsapp === null) errors.whatsapp = "Numéro invalide (ex. 06 12 34 56 78 ou +33 6 12 34 56 78)";
  const shipping = parseEuros(formData.get("shipping")) ?? 0;
  if (Number.isNaN(shipping) || shipping < 0) errors.shipping = "Montant invalide";
  const delay = Number(formData.get("paymentDelayHours"));
  if (!Number.isInteger(delay) || delay < 1 || delay > 336) errors.paymentDelayHours = "Entre 1 et 336 heures";
  const leadTime = str(formData, "defaultLeadTime", 60);
  if (!leadTime) errors.defaultLeadTime = "Obligatoire";
  const socials = Object.fromEntries(["instagram", "tiktok", "snapchat"].map((k) => [k, url(str(formData, k))]));
  for (const [k, v] of Object.entries(socials)) if (v === null) errors[k] = "Adresse complète commençant par https://";
  const siret = str(formData, "siret").replace(/\s/g, "");
  if (siret && !/^\d{14}$/.test(siret)) errors.siret = "14 chiffres";
  if (Object.keys(errors).length) return { errors, message: "Certains champs sont à corriger." };

  await saveSettings({
    whatsapp: whatsapp ?? "",
    paymentInfo: str(formData, "paymentInfo", 1000),
    shippingCents: shipping,
    paymentDelayHours: delay,
    defaultLeadTime: leadTime,
    instagram: socials.instagram as string,
    tiktok: socials.tiktok as string,
    snapchat: socials.snapchat as string,
    legalName: str(formData, "legalName"),
    legalStatus: str(formData, "legalStatus"),
    siret,
    legalAddress: str(formData, "legalAddress"),
    contactEmail: str(formData, "contactEmail"),
    emailTexts: Object.fromEntries(EMAIL_TEXT_KEYS.map((k) => [k, str(formData, `email_${k}`, 2000)])),
  });
  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true, message: "Réglages enregistrés." };
}
