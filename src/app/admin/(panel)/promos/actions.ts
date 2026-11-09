"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { parseEuros } from "@/lib/money";
import { normalizeCode } from "@/lib/promo";

export async function createPromo(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const type = String(formData.get("type"));
  const errors: Record<string, string> = {};
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) errors.code = "3 à 30 caractères : lettres, chiffres, - ou _";
  let value = 0;
  if (type === "percent") {
    value = Number(formData.get("value"));
    if (!Number.isInteger(value) || value < 1 || value > 90) errors.value = "Pourcentage entre 1 et 90";
  } else if (type === "fixed") {
    value = parseEuros(formData.get("value")) ?? NaN;
    if (!value || Number.isNaN(value)) errors.value = "Montant invalide";
  } else errors.type = "Type invalide";
  const min = parseEuros(formData.get("min"));
  if (Number.isNaN(min)) errors.min = "Montant invalide";
  const endsRaw = String(formData.get("endsAt") ?? "");
  const endsAt = endsRaw ? new Date(`${endsRaw}T23:59:59`) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) errors.endsAt = "Date invalide";
  const maxRaw = String(formData.get("maxUses") ?? "").trim();
  const maxUses = maxRaw ? Number(maxRaw) : null;
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) errors.maxUses = "Nombre entier positif";
  const [exists] = code ? await db.select({ id: schema.promoCodes.id }).from(schema.promoCodes).where(eq(schema.promoCodes.code, code)) : [];
  if (exists) errors.code = "Ce code existe déjà";
  if (Object.keys(errors).length) return { ok: false, errors, created: "" };
  await db.insert(schema.promoCodes).values({ code, type, value, minSubtotalCents: min, endsAt, maxUses });
  refresh();
  return { ok: true, errors: {} as Record<string, string>, created: code };
}

export async function togglePromo(id: string, active: boolean) {
  await requireAdmin();
  await db.update(schema.promoCodes).set({ active }).where(eq(schema.promoCodes.id, z.uuid().parse(id)));
  refresh();
}

export async function deletePromo(id: string) {
  await requireAdmin();
  await db.delete(schema.promoCodes).where(eq(schema.promoCodes.id, z.uuid().parse(id)));
  refresh();
}
