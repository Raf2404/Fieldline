"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { parseEuros } from "@/lib/money";
import { normalizePhone } from "@/lib/orders";
import { SETTINGS_TAG, saveSettings } from "@/lib/settings";

export type SettingsState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

export async function saveShopSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return { message: "Seul le propriétaire peut modifier les réglages." };
  const errors: Record<string, string> = {};
  const rawPhone = String(formData.get("whatsapp") ?? "").trim();
  const whatsapp = rawPhone ? normalizePhone(rawPhone) : "";
  if (whatsapp === null) errors.whatsapp = "Numéro invalide (ex. 06 12 34 56 78 ou +33 6 12 34 56 78)";
  const shipping = parseEuros(formData.get("shipping")) ?? 0;
  if (Number.isNaN(shipping) || shipping < 0) errors.shipping = "Montant invalide";
  const delay = Number(formData.get("paymentDelayHours"));
  if (!Number.isInteger(delay) || delay < 1 || delay > 336) errors.paymentDelayHours = "Entre 1 et 336 heures";
  if (Object.keys(errors).length) return { errors, message: "Certains champs sont à corriger." };

  await saveSettings({
    whatsapp: whatsapp ?? "",
    paymentInfo: String(formData.get("paymentInfo") ?? "").trim().slice(0, 1000),
    shippingCents: shipping,
    paymentDelayHours: delay,
  });
  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true, message: "Réglages enregistrés." };
}
