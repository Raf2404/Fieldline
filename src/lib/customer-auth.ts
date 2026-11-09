import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db, schema } from "@/db";

// Espace client sans mot de passe : un lien de connexion à usage unique est envoyé par e-mail.

const COOKIE = "client_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours
const LINK_MINUTES = 30;

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Crée un lien de connexion ; null si trop de demandes récentes pour cet e-mail. */
export async function createLoginToken(email: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.loginTokens)
    .where(and(eq(schema.loginTokens.email, email), gt(schema.loginTokens.createdAt, new Date(Date.now() - 15 * 60_000))));
  if (n >= 3) return null;
  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.loginTokens).values({
    email,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000),
  });
  return token;
}

/** Valide le lien (une seule fois), crée le compte au besoin et ouvre la session. */
export async function consumeLoginToken(token: string) {
  const [row] = await db
    .update(schema.loginTokens)
    .set({ usedAt: new Date() })
    .where(
      and(eq(schema.loginTokens.tokenHash, hash(token)), isNull(schema.loginTokens.usedAt), gt(schema.loginTokens.expiresAt, new Date())),
    )
    .returning();
  if (!row) return null;
  let [customer] = await db.select().from(schema.customers).where(eq(schema.customers.email, row.email));
  if (!customer) {
    // Pré-remplit le profil avec la dernière commande passée avec cet e-mail.
    const [last] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.email, row.email))
      .orderBy(sql`${schema.orders.createdAt} desc`)
      .limit(1);
    [customer] = await db
      .insert(schema.customers)
      .values({
        email: row.email,
        ...(last
          ? {
              firstName: last.firstName,
              lastName: last.lastName,
              phone: last.phone,
              address1: last.address1,
              address2: last.address2,
              postalCode: last.postalCode,
              city: last.city,
            }
          : {}),
      })
      .onConflictDoNothing()
      .returning();
    if (!customer) [customer] = await db.select().from(schema.customers).where(eq(schema.customers.email, row.email));
  }
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(customer.id)
    .setAudience("client")
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return customer;
}

export async function getCustomer() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], audience: "client" });
    if (!payload.sub) return null;
    const [c] = await db.select().from(schema.customers).where(eq(schema.customers.id, payload.sub));
    return c ?? null;
  } catch {
    return null;
  }
}

export async function logoutCustomer() {
  (await cookies()).delete(COOKIE);
}
