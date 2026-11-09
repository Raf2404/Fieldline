"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";

const input = z.object({
  productId: z.uuid(),
  size: z.string().max(10).nullable(),
  email: z.email().max(200),
});

export async function notifyBackInStock(_prev: unknown, formData: FormData) {
  const parsed = input.safeParse({
    productId: formData.get("productId"),
    size: formData.get("size") || null,
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) return { ok: false, error: "Adresse e-mail invalide." };
  const { productId, size, email } = parsed.data;
  const existing = await db
    .select({ id: schema.backInStockRequests.id })
    .from(schema.backInStockRequests)
    .where(
      and(
        eq(schema.backInStockRequests.productId, productId),
        eq(schema.backInStockRequests.email, email),
        size ? eq(schema.backInStockRequests.size, size) : isNull(schema.backInStockRequests.size),
        isNull(schema.backInStockRequests.notifiedAt),
      ),
    );
  if (!existing.length) {
    await db.insert(schema.backInStockRequests).values({ productId, size, email });
  }
  return { ok: true, error: null };
}
