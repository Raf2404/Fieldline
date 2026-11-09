import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/db";
import { PUBLIC_STATUSES, compareSizes, productAvailability, type Availability } from "./catalog";

export const CATALOG_TAG = "catalog";

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string | null;
  surfaces: string[];
  priceCents: number;
  compareAtCents: number | null;
  description: string;
  leadTime: string;
  tags: string[];
  status: string;
  allowBackorder: boolean;
  position: number;
  createdAt: string;
  sizes: { size: string; stock: number }[];
  images: string[];
  totalStock: number;
  availability: Availability;
};

/**
 * Tout le catalogue public en une requête mise en cache.
 * Pour une boutique de quelques centaines d'articles, filtrer en mémoire est plus rapide qu'aller en base.
 * Le cache est vidé dès qu'un article change dans l'admin (tag « catalog »).
 */
export async function getPublicCatalog(): Promise<PublicProduct[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const rows = await db
    .select({
      id: schema.products.id,
      slug: schema.products.slug,
      name: schema.products.name,
      brand: schema.brands.name,
      model: schema.products.model,
      surfaces: schema.products.surfaces,
      priceCents: schema.products.priceCents,
      compareAtCents: schema.products.compareAtCents,
      description: schema.products.description,
      leadTime: schema.products.leadTime,
      tags: schema.products.tags,
      status: schema.products.status,
      allowBackorder: schema.products.allowBackorder,
      position: schema.products.position,
      createdAt: schema.products.createdAt,
    })
    .from(schema.products)
    .innerJoin(schema.brands, eq(schema.brands.id, schema.products.brandId))
    .where(inArray(schema.products.status, PUBLIC_STATUSES))
    .orderBy(asc(schema.products.position));

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [sizes, images] = await Promise.all([
    db.select().from(schema.productSizes).where(inArray(schema.productSizes.productId, ids)),
    db
      .select()
      .from(schema.productImages)
      .where(inArray(schema.productImages.productId, ids))
      .orderBy(asc(schema.productImages.position)),
  ]);

  return rows.map((r) => {
    const s = sizes
      .filter((x) => x.productId === r.id)
      .sort((a, b) => compareSizes(a.size, b.size))
      .map((x) => ({ size: x.size, stock: Math.max(0, x.stock) }));
    const totalStock = s.reduce((n, x) => n + x.stock, 0);
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      sizes: s,
      images: images.filter((i) => i.productId === r.id).map((i) => i.key),
      totalStock,
      availability: productAvailability({ ...r, totalStock }),
    };
  });
}

export async function getPublicProduct(slug: string) {
  const all = await getPublicCatalog();
  return all.find((p) => p.slug === slug) ?? null;
}
