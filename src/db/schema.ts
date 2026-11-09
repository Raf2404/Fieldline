import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgSequence,
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

/* ---------- Commandes ---------- */

export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "ordered",
  "received",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1001 });

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: integer("number")
      .notNull()
      .unique()
      .default(sql`nextval('order_number_seq')`),
    /** Jeton secret du lien de confirmation (le client n'a pas de compte). */
    token: text("token").notNull().unique(),
    status: orderStatus("status").notNull().default("pending_payment"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    /** Format international sans « + » (ex. 33612345678), prêt pour un lien WhatsApp. */
    phone: text("phone").notNull(),
    address1: text("address1").notNull(),
    address2: text("address2"),
    postalCode: text("postal_code").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull().default("France"),
    customerNote: text("customer_note"),
    internalNote: text("internal_note"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    /** Au-delà, une commande non payée est annulée et le stock libéré. */
    paymentDueAt: timestamp("payment_due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Vrai quand les paires réservées ont été remises en stock (annulation). */
    stockReleased: boolean("stock_released").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_email_idx").on(t.email)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    /** Copie au moment de la commande : la fiche peut changer ensuite. */
    productName: text("product_name").notNull(),
    brand: text("brand").notNull(),
    imageKey: text("image_key"),
    size: text("size").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    /** Paires réellement prises sur le stock (moins que quantity si vente sur commande). */
    reservedQty: integer("reserved_qty").notNull().default(0),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatus("status"),
    message: text("message").notNull(),
    /** client, admin (nom) ou système */
    actor: text("actor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

/** Réglages modifiables depuis l'admin (numéro WhatsApp, frais de port…). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];
