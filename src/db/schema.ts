import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Statut choisi par l'admin. La rupture « automatique » (stock à 0) est calculée, pas stockée. */
export const productStatus = pgEnum("product_status", [
  "online",
  "out_of_stock",
  "coming_soon",
  "draft",
  "deleted",
]);

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  position: integer("position").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id),
    model: text("model"),
    /** FG, SG, AG, TF, IC */
    surfaces: text("surfaces").array().notNull().default(sql`'{}'::text[]`),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    /** Prix d'achat : jamais envoyé au site public. */
    costCents: integer("cost_cents"),
    /** Texte simple : **gras** et listes « - ». */
    description: text("description").notNull().default(""),
    leadTime: text("lead_time").notNull().default("2 à 3 semaines"),
    /** nouveaute, promo, best-seller */
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    status: productStatus("status").notNull().default("draft"),
    /** Vente sur commande : réservation possible même à 0 en stock. */
    allowBackorder: boolean("allow_backorder").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_status_idx").on(t.status),
  ],
);

export const productSizes = pgTable(
  "product_sizes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Pointure EU, ex. « 42 » ou « 42.5 » */
    size: text("size").notNull(),
    stock: integer("stock").notNull().default(0),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("product_sizes_unique").on(t.productId, t.size)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Clé de stockage ; les URL (vignette / grande) sont dérivées. */
    key: text("key").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  /** owner : tous les droits ; staff : associé aux droits limités (sera utilisé plus tard). */
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const backInStockRequests = pgTable(
  "back_in_stock_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size"),
    email: text("email").notNull(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bis_product_idx").on(t.productId)],
);

export type Product = typeof products.$inferSelect;
export type ProductSize = typeof productSizes.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type ProductStatus = (typeof productStatus.enumValues)[number];
