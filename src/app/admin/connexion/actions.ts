"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { createAdminSession, destroyAdminSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

// Freine les essais de mot de passe à répétition (par instance du serveur).
const failures = new Map<string, { n: number; until: number }>();

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const f = failures.get(email);
  if (f && f.until > Date.now()) {
    return { error: "Trop d'essais. Réessaie dans quelques minutes." };
  }
  const [admin] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email));
  const ok = admin ? await verifyPassword(password, admin.passwordHash) : false;
  if (!admin || !ok) {
    const n = (f?.n ?? 0) + 1;
    failures.set(email, { n, until: n >= 5 ? Date.now() + 10 * 60_000 : 0 });
    await new Promise((r) => setTimeout(r, 600));
    return { error: "E-mail ou mot de passe incorrect." };
  }
  failures.delete(email);
  await createAdminSession(admin.id);
  redirect("/admin");
}

export async function logout() {
  await destroyAdminSession();
  redirect("/admin/connexion");
}
