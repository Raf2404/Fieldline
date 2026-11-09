import "server-only";
import { and, asc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { LOW_STOCK_THRESHOLD, compareSizes, productAvailability, type Status } from "./catalog";

export type AdminListFilters = { q?: string; status?: string; brand?: string };

export async function listBrands() {
  return db.select().from(schema.brands).orderBy(asc(schema.brands.position), asc(schema.brands.name));
}

export async function listAdminProducts(f: AdminListFilters) {
  const conds = [];
  if (f.status === "deleted") conds.push(eq(schema.products.status, "deleted"));
  else {
    conds.push(ne(schema.products.status, "deleted"));
    if (f.status) conds.push(eq(schema.products.status, f.status as Status));
  }
  if (f.brand) conds.push(eq(schema.products.brandId, f.brand));
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "")}%`;
    conds.push(or(ilike(schema.products.name, like), ilike(schema.products.model, like), ilike(schema.brands.name, like)));
  }
  const rows = await db
    .select({
      id: schema.products.id,
      slug: schema.products.slug,
      name: schema.products.name,
      brand: schema.brands.name,
      priceCents: schema.products.priceCents,
      status: schema.products.status,
      allowBackorder: schema.products.allowBackorder,
      position: schema.products.position,
    })
    .from(schema.products)
    .innerJoin(schema.brands, eq(schema.brands.id, schema.products.brandId))
    .where(and(...conds))
    .orderBy(asc(schema.products.position), asc(schema.products.createdAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [sizes, firstImages] = await Promise.all([
    db.select().from(schema.productSizes).where(inArray(schema.productSizes.productId, ids)),
    db
      .selectDistinctOn([schema.productImages.productId], {
        productId: schema.productImages.productId,
        key: schema.productImages.key,
      })
      .from(schema.productImages)
      .where(inArray(schema.productImages.productId, ids))
      .orderBy(schema.productImages.productId, asc(schema.productImages.position)),
  ]);
  return rows.map((r) => {
    const s = sizes
      .filter((x) => x.productId === r.id)
      .sort((a, b) => compareSizes(a.size, b.size))
      .map((x) => ({ size: x.size, stock: x.stock }));
    const totalStock = s.reduce((n, x) => n + Math.max(0, x.stock), 0);
    return {
      ...r,
      sizes: s,
      totalStock,
      image: firstImages.find((i) => i.productId === r.id)?.key ?? null,
      availability: productAvailability({ ...r, totalStock }),
    };
  });
}
export type AdminProductRow = Awaited<ReturnType<typeof listAdminProducts>>[number];

export async function getProductForEdit(id: string) {
  const [p] = await db.select().from(schema.products).where(eq(schema.products.id, id));
  if (!p) return null;
  const [sizes, images] = await Promise.all([
    db.select().from(schema.productSizes).where(eq(schema.productSizes.productId, id)),
    db.select().from(schema.productImages).where(eq(schema.productImages.productId, id)).orderBy(asc(schema.productImages.position)),
  ]);
  return {
    ...p,
    sizes: sizes.sort((a, b) => compareSizes(a.size, b.size)).map((s) => ({ size: s.size, stock: s.stock })),
    images: images.map((i) => i.key),
  };
}
export type EditableProduct = NonNullable<Awaited<ReturnType<typeof getProductForEdit>>>;

export async function getDashboardStats() {
  const [counts] = await db
    .select({
      online: sql<number>`count(*) filter (where ${schema.products.status} = 'online')`.mapWith(Number),
      draft: sql<number>`count(*) filter (where ${schema.products.status} = 'draft')`.mapWith(Number),
      total: sql<number>`count(*) filter (where ${schema.products.status} <> 'deleted')`.mapWith(Number),
    })
    .from(schema.products);
  const lowStock = await db.execute<{ id: string; name: string; size: string; stock: number }>(sql`
    select p.id, p.name, s.size, s.stock
    from ${schema.productSizes} s join ${schema.products} p on p.id = s.product_id
    where p.status = 'online' and not p.allow_backorder and s.stock <= ${LOW_STOCK_THRESHOLD - 2}
    order by s.stock asc, p.name limit 12`);
  const [alerts] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.backInStockRequests)
    .where(sql`${schema.backInStockRequests.notifiedAt} is null`);
  return { ...counts, lowStock: [...lowStock], backInStock: alerts.n };
}
