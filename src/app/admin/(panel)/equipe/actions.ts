"use server";

import { randomBytes } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireOwner } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function addMember(_prev: unknown, formData: FormData) {
  await requireOwner();
  const parsed = z
    .object({ name: z.string().trim().min(1, "Prénom obligatoire").max(60), email: z.email("E-mail invalide"), role: z.enum(["staff", "owner"]) })
    .safeParse({ name: formData.get("name"), email: String(formData.get("email") ?? "").trim().toLowerCase(), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, password: null };
  const [exists] = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).where(eq(schema.adminUsers.email, parsed.data.email));
  if (exists) return { error: "Cette adresse a déjà un accès.", password: null };
  // Mot de passe provisoire, affiché une seule fois : la personne le change dans « Sécurité ».
  const password = randomBytes(12).toString("base64url");
  await db.insert(schema.adminUsers).values({ ...parsed.data, passwordHash: await hashPassword(password) });
  refresh();
  return { error: null, password, email: parsed.data.email };
}

export async function removeMember(id: string) {
  const me = await requireOwner();
  const target = z.uuid().parse(id);
  if (target === me.id) return { error: "Tu ne peux pas supprimer ton propre accès." };
  const [{ owners }] = await db
    .select({ owners: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.adminUsers)
    .where(and(eq(schema.adminUsers.role, "owner"), ne(schema.adminUsers.id, target)));
  if (owners < 1) return { error: "Il doit rester au moins un propriétaire." };
  await db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, target));
  refresh();
  return { error: null };
}
