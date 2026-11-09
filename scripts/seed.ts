/**
 * Remplit la base locale avec des articles de démonstration (photos générées).
 * À ne PAS lancer sur la base de production. Usage : npm run db:seed
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { saveProductImage } from "../src/lib/storage";
import { slugify } from "../src/lib/catalog";

const url = process.env.DATABASE_URL!;
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url) && !process.argv.includes("--force")) {
  console.error("Refusé : DATABASE_URL ne pointe pas vers une base locale (ajoute --force si tu es sûr).");
  process.exit(1);
}
const client = postgres(url, { max: 1, prepare: false, debug: process.env.DBG ? (_c: number, q: string) => console.log("Q", q.slice(0, 90)) : undefined });
const db = drizzle(client, { schema });

const BRANDS = ["Nike", "Adidas", "Puma", "New Balance", "Mizuno"];

type Demo = {
  name: string;
  brand: string;
  model: string;
  surfaces: string[];
  price: number;
  compareAt?: number;
  tags?: string[];
  colors: [string, string];
  stock: Record<string, number>;
  status?: "online" | "coming_soon";
  backorder?: boolean;
};

const DEMOS: Demo[] = [
  { name: "Mercurial Vapor Elite", brand: "Nike", model: "Vapor 16", surfaces: ["FG", "AG"], price: 149, compareAt: 279, tags: ["best-seller"], colors: ["#e8ff3a", "#111111"], stock: { "40": 2, "41": 4, "42": 6, "42.5": 3, "43": 5, "44": 2, "45": 0 } },
  { name: "Phantom Luna II Pro", brand: "Nike", model: "Phantom", surfaces: ["FG"], price: 99, compareAt: 159, tags: ["promo"], colors: ["#ff5a36", "#1b1b1b"], stock: { "40": 1, "41": 0, "42": 2, "43": 0, "44": 1 } },
  { name: "Predator Elite", brand: "Adidas", model: "Predator 25", surfaces: ["FG", "SG"], price: 139, compareAt: 249, tags: ["nouveaute"], colors: ["#d7263d", "#f5f5f5"], stock: { "40": 3, "41": 5, "42": 5, "43": 4, "44": 3, "45": 2, "46": 1 } },
  { name: "F50 Elite", brand: "Adidas", model: "F50", surfaces: ["FG", "AG"], price: 129, compareAt: 249, tags: ["best-seller", "nouveaute"], colors: ["#3a86ff", "#ffffff"], stock: { "39": 1, "40": 2, "41": 3, "42": 0, "43": 2, "44": 2 } },
  { name: "Copa Pure 3 Elite", brand: "Adidas", model: "Copa", surfaces: ["FG"], price: 119, compareAt: 219, colors: ["#f4f1de", "#2b2d42"], stock: { "41": 0, "42": 0, "43": 0 }, backorder: true },
  { name: "Future 8 Ultimate", brand: "Puma", model: "Future", surfaces: ["FG", "AG"], price: 109, compareAt: 219, tags: ["promo"], colors: ["#06d6a0", "#073b4c"], stock: { "40": 2, "41": 2, "42": 4, "43": 4, "44": 1 } },
  { name: "Ultra 5 Ultimate", brand: "Puma", model: "Ultra", surfaces: ["FG", "TF"], price: 89, compareAt: 199, colors: ["#ffbe0b", "#3a0ca3"], stock: { "40": 0, "41": 1, "42": 0, "43": 1 } },
  { name: "Tekela v5 Pro", brand: "New Balance", model: "Tekela", surfaces: ["FG", "SG"], price: 115, compareAt: 200, tags: ["nouveaute"], colors: ["#e0e1dd", "#0d1b2a"], stock: {}, status: "coming_soon" },
  { name: "Morelia Neo IV Beta", brand: "Mizuno", model: "Morelia", surfaces: ["FG"], price: 159, compareAt: 260, colors: ["#fafafa", "#c1121f"], stock: { "40": 1, "41": 2, "42": 2, "43": 1, "44": 1 } },
  { name: "Mercurial Superfly Academy TF", brand: "Nike", model: "Superfly", surfaces: ["TF"], price: 59, compareAt: 99, tags: ["promo"], colors: ["#7b2cbf", "#ff9e00"], stock: { "38": 2, "39": 3, "40": 5, "41": 5, "42": 4 } },
  { name: "Predator League Salle", brand: "Adidas", model: "Predator", surfaces: ["IC"], price: 45, compareAt: 80, colors: ["#222222", "#ff006e"], stock: { "39": 2, "40": 2, "41": 1, "42": 3, "43": 2 } },
];

/** Visuel de démonstration : silhouette stylisée de crampon sur fond coloré. */
function demoImage(main: string, accent: string, angle: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1400" viewBox="0 0 1400 1400">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f2"/><stop offset="1" stop-color="#e6e6e1"/></linearGradient></defs>
  <rect width="1400" height="1400" fill="url(#g)"/>
  <g transform="rotate(${angle} 700 700) translate(160 430)">
    <path d="M40 330 C 40 240, 120 190, 260 170 L 520 120 C 600 40, 700 10, 820 30 C 930 50, 1020 120, 1060 230 C 1080 290, 1070 330, 1020 350 L 80 370 C 50 370, 40 355, 40 330 Z" fill="${main}"/>
    <path d="M520 120 C 600 40, 700 10, 820 30 L 760 200 L 520 200 Z" fill="${accent}" opacity="0.9"/>
    <path d="M150 300 L 980 270" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
    <rect x="30" y="362" width="1040" height="34" rx="17" fill="#1a1a1a"/>
    ${[120, 260, 420, 640, 820, 960].map((x) => `<rect x="${x}" y="392" width="40" height="56" rx="10" fill="#1a1a1a"/>`).join("")}
  </g>
  <text x="700" y="1300" font-family="Arial, sans-serif" font-size="40" fill="#9a9a94" text-anchor="middle">PHOTO DE DÉMONSTRATION</text>
</svg>`;
  return Buffer.from(svg);
}

async function main() {
  const existing = await db.select().from(schema.products).limit(1);
  if (existing.length && !process.argv.includes("--reset")) {
    console.log("Des articles existent déjà. Relance avec --reset pour tout effacer et recommencer.");
    return;
  }
  await db.delete(schema.products);
  await db.delete(schema.brands);

  const brandIds = new Map<string, string>();
  for (const [i, name] of BRANDS.entries()) {
    const [b] = await db.insert(schema.brands).values({ name, position: i }).returning();
    brandIds.set(name, b.id);
  }

  for (const [i, d] of DEMOS.entries()) {
    const [p] = await db
      .insert(schema.products)
      .values({
        slug: slugify(`${d.brand} ${d.name}`),
        name: d.name,
        brandId: brandIds.get(d.brand)!,
        model: d.model,
        surfaces: d.surfaces,
        priceCents: d.price * 100,
        compareAtCents: d.compareAt ? d.compareAt * 100 : null,
        costCents: Math.round(d.price * 0.6) * 100,
        description: `**Authentique, neuve, en boîte d'origine.**\n\nLa ${d.name} de ${d.brand}, pensée pour la vitesse et le contrôle du ballon.\n\n- Tige légère et souple\n- Semelle adaptée aux terrains ${d.surfaces.join(" / ")}\n- Livraison suivie en 2 à 3 semaines`,
        tags: d.tags ?? [],
        status: d.status ?? "online",
        allowBackorder: d.backorder ?? false,
        position: i,
        createdAt: new Date(Date.now() - (DEMOS.length - i) * 86400000),
      })
      .returning();
    const sizes = Object.entries(d.stock);
    if (sizes.length) {
      await db.insert(schema.productSizes).values(
        sizes.map(([size, stock], position) => ({ productId: p.id, size, stock, position })),
      );
    }
    const keys = await Promise.all([-8, 6, -20].map((a) => saveProductImage(demoImage(d.colors[0], d.colors[1], a))));
    await db.insert(schema.productImages).values(keys.map((key, position) => ({ productId: p.id, key, position })));
    console.log(`✓ ${d.brand} ${d.name}`);
  }
  console.log(`\n${DEMOS.length} articles de démonstration créés.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
