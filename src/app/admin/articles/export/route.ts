import { asc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAdmin } from "@/lib/auth";
import { compareSizes } from "@/lib/catalog";
import { CSV_COLUMNS, toCsv } from "@/lib/csv";
import { centsToInput } from "@/lib/money";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return new Response("Non autorisé", { status: 401 });
  const products = await db
    .select({ p: schema.products, brand: schema.brands.name })
    .from(schema.products)
    .innerJoin(schema.brands, eq(schema.brands.id, schema.products.brandId))
    .where(ne(schema.products.status, "deleted"))
    .orderBy(asc(schema.products.position));
  const sizes = await db.select().from(schema.productSizes);
  const rows = products.map(({ p, brand }) => [
    p.slug,
    p.name,
    brand,
    p.model,
    p.surfaces.join("|"),
    centsToInput(p.priceCents),
    centsToInput(p.compareAtCents),
    admin.role === "owner" ? centsToInput(p.costCents) : "",
    p.leadTime,
    p.tags.join("|"),
    p.status,
    p.allowBackorder ? "oui" : "non",
    sizes
      .filter((s) => s.productId === p.id)
      .sort((a, b) => compareSizes(a.size, b.size))
      .map((s) => `${s.size}:${s.stock}`)
      .join("|"),
    p.description,
  ]);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv([[...CSV_COLUMNS], ...rows]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="articles-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
