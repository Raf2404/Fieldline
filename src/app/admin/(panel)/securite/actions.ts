"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";

type R = { ok?: boolean; error?: string } | null;

export async function changePassword(_prev: R, formData: FormData): Promise<R> {
  const admin = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const [row] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, admin.id));
  if (!(await verifyPassword(current, row.passwordHash))) return { error: "Mot de passe actuel incorrect." };
  if (next.length < 12) return { error: "12 caractères minimum." };
  if (next !== String(formData.get("confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };
  await db.update(schema.adminUsers).set({ passwordHash: await hashPassword(next) }).where(eq(schema.adminUsers.id, admin.id));
  return { ok: true };
}

/** Prépare un nouveau secret (pas encore actif tant qu'un code n'a pas été validé). */
export async function startTotpSetup() {
  const admin = await requireAdmin();
  await db.update(schema.adminUsers).set({ totpSecret: generateTotpSecret(), totpEnabledAt: null }).where(eq(schema.adminUsers.id, admin.id));
  refresh();
}

export async function confirmTotp(_prev: R, formData: FormData): Promise<R> {
  const admin = await requireAdmin();
  const [row] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, admin.id));
  if (!row.totpSecret || !verifyTotp(row.totpSecret, String(formData.get("code") ?? ""))) return { error: "Code incorrect. Vérifie l'heure de ton téléphone et réessaie." };
  await db.update(schema.adminUsers).set({ totpEnabledAt: new Date() }).where(eq(schema.adminUsers.id, admin.id));
  refresh();
  return { ok: true };
}

export async function disableTotp(_prev: R, formData: FormData): Promise<R> {
  const admin = await requireAdmin();
  const [row] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, admin.id));
  if (!row.totpSecret || !verifyTotp(row.totpSecret, String(formData.get("code") ?? ""))) return { error: "Code incorrect." };
  await db.update(schema.adminUsers).set({ totpSecret: null, totpEnabledAt: null }).where(eq(schema.adminUsers.id, admin.id));
  refresh();
  return { ok: true };
}
