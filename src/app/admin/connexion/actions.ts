"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { clearPending2fa, createAdminSession, createPending2fa, destroyAdminSession, readPending2fa } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { verifyTotp } from "@/lib/totp";

// Freine les essais à répétition (par instance du serveur).
const failures = new Map<string, { n: number; until: number }>();
const blocked = (k: string) => (failures.get(k)?.until ?? 0) > Date.now();
async function fail(k: string) {
  const n = (failures.get(k)?.n ?? 0) + 1;
  failures.set(k, { n, until: n >= 5 ? Date.now() + 10 * 60_000 : 0 });
  await new Promise((r) => setTimeout(r, 600));
}

export type LoginState = { error?: string; step?: "code" } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (blocked(email)) return { error: "Trop d'essais. Réessaie dans quelques minutes." };
  const [admin] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email));
  const ok = admin ? await verifyPassword(password, admin.passwordHash) : false;
  if (!admin || !ok) {
    await fail(email);
    return { error: "E-mail ou mot de passe incorrect." };
  }
  failures.delete(email);
  if (admin.totpEnabledAt && admin.totpSecret) {
    await createPending2fa(admin.id);
    return { step: "code" };
  }
  await createAdminSession(admin.id);
  redirect("/admin");
}

export async function verifyLoginCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const id = await readPending2fa();
  if (!id) return { error: "Session expirée, recommence la connexion." };
  const key = `2fa:${id}`;
  if (blocked(key)) return { step: "code", error: "Trop d'essais. Réessaie dans quelques minutes." };
  const [admin] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, id));
  if (!admin?.totpSecret || !verifyTotp(admin.totpSecret, String(formData.get("code") ?? ""))) {
    await fail(key);
    return { step: "code", error: "Code incorrect." };
  }
  failures.delete(key);
  await clearPending2fa();
  await createAdminSession(admin.id);
  redirect("/admin");
}

export async function logout() {
  await destroyAdminSession();
  redirect("/admin/connexion");
}
