import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { db, schema } from "@/db";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET manquant ou trop court (32 caractères min.)");
  return new TextEncoder().encode(s);
}

export async function createAdminSession(adminId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setAudience("admin")
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

const PENDING = "admin_2fa";

/** Mot de passe validé, code de double authentification attendu (5 minutes). */
export async function createPending2fa(adminId: string) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(adminId).setAudience("admin-2fa").setExpirationTime("5m").sign(secret());
  (await cookies()).set(PENDING, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/admin", maxAge: 300 });
}

export async function readPending2fa() {
  const token = (await cookies()).get(PENDING)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], audience: "admin-2fa" });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function clearPending2fa() {
  (await cookies()).delete({ name: PENDING, path: "/admin" });
}

export async function destroyAdminSession() {
  (await cookies()).delete(COOKIE);
}

export type Admin = { id: string; name: string; email: string; role: string };

/** Admin connecté, ou null. */
export async function getAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], audience: "admin" });
    if (!payload.sub) return null;
    const [admin] = await db
      .select({
        id: schema.adminUsers.id,
        name: schema.adminUsers.name,
        email: schema.adminUsers.email,
        role: schema.adminUsers.role,
      })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, payload.sub));
    return admin ?? null;
  } catch {
    return null;
  }
}

/** Réservé au propriétaire (réglages, équipe, chiffre d'affaires). Un associé est renvoyé au tableau de bord. */
export async function requireOwner(): Promise<Admin> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin?acces=refuse");
  return admin;
}

/** À appeler en tête de chaque page et de chaque action de l'admin. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/connexion");
  return admin;
}
