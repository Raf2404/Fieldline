"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";

export async function findOrder(_prev: unknown, formData: FormData) {
  const number = Number(String(formData.get("numero") ?? "").replace(/\D/g, ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!number || !email) return { error: "Indique ton numéro de commande et ton e-mail." };
  const [order] = await db
    .select({ token: schema.orders.token })
    .from(schema.orders)
    .where(and(eq(schema.orders.number, number), eq(schema.orders.email, email)));
  if (!order) {
    await new Promise((r) => setTimeout(r, 500)); // freine les essais au hasard
    return { error: "Aucune commande ne correspond. Vérifie le numéro (ex. 1042) et l'e-mail utilisé pour commander." };
  }
  redirect(`/commande/${order.token}`);
}
