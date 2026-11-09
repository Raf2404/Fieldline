"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_LEAD_TIME,
  MAX_PHOTOS,
  STATUS_LABELS,
  SURFACE_CODES,
  TAG_CODES,
  compareSizes,
  slugify,
  type Status,
} from "@/lib/catalog";
import { CSV_COLUMNS, parseCsv } from "@/lib/csv";
import { parseEuros } from "@/lib/money";
import { expireCatalog } from "@/lib/revalidate";
import { MAX_UPLOAD_BYTES, deleteProductImage, imageUrl, saveProductImage } from "@/lib/storage";

const STATUSES = Object.keys(STATUS_LABELS) as [Status, ...Status[]];

function catalogChanged() {
  expireCatalog();
  refresh();
}

/* ---------- Création / modification ---------- */

const sizeRow = z.object({
  size: z.string().trim().min(1, "Pointure vide").max(10),
  stock: z.number().int().min(0, "Stock négatif"),
});

const productInput = z.object({
  name: z.string().trim().min(2, "Le nom est obligatoire").max(120),
  brandId: z.string(),
  newBrand: z.string().trim().max(60),
  model: z.string().trim().max(80),
  surfaces: z.array(z.enum(SURFACE_CODES as [string, ...string[]])).min(1, "Coche au moins un type de terrain"),
  priceCents: z.number({ error: "Prix de vente invalide" }).int().positive("Le prix de vente est obligatoire"),
  compareAtCents: z.number({ error: "Prix barré invalide" }).int().positive().nullable(),
  costCents: z.number({ error: "Prix d'achat invalide" }).int().min(0).nullable(),
  description: z.string().max(5000),
  leadTime: z.string().trim().min(1, "Le délai est obligatoire").max(60),
  tags: z.array(z.enum(TAG_CODES as [string, ...string[]])),
  status: z.enum(STATUSES),
  allowBackorder: z.boolean(),
  sizes: z.array(sizeRow).min(1, "Ajoute au moins une pointure"),
  images: z.array(z.string().regex(/^p\/[0-9a-f-]{36}$/)).min(1, "Ajoute au moins une photo").max(MAX_PHOTOS),
});

export type SaveState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

function readJson<T>(v: FormDataEntryValue | null, fallback: T): T {
  try {
    return v ? (JSON.parse(String(v)) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function uniqueSlug(base: string, exceptId?: string) {
  const root = base || "article";
  const taken = await db
    .select({ slug: schema.products.slug })
    .from(schema.products)
    .where(
      and(
        sql`${schema.products.slug} like ${root + "%"}`,
        exceptId ? ne(schema.products.id, exceptId) : undefined,
      ),
    );
  const set = new Set(taken.map((t) => t.slug));
  if (!set.has(root)) return root;
  for (let i = 2; ; i++) if (!set.has(`${root}-${i}`)) return `${root}-${i}`;
}

async function resolveBrand(brandId: string, newBrand: string) {
  if (brandId !== "__new") return brandId;
  const name = newBrand.trim();
  const [existing] = await db.select().from(schema.brands).where(sql`lower(${schema.brands.name}) = lower(${name})`);
  if (existing) return existing.id;
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${schema.brands.position}), 0)`.mapWith(Number) }).from(schema.brands);
  const [b] = await db.insert(schema.brands).values({ name, position: max + 1 }).returning();
  return b.id;
}

/** Supprime les fichiers photo qui ne sont plus utilisés par aucun article. */
async function deleteOrphanImages(keys: string[]) {
  if (!keys.length) return;
  const still = await db
    .select({ key: schema.productImages.key })
    .from(schema.productImages)
    .where(inArray(schema.productImages.key, keys));
  const used = new Set(still.map((s) => s.key));
  await Promise.all(keys.filter((k) => !used.has(k)).map((k) => deleteProductImage(k).catch(() => {})));
}

export async function saveProduct(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;

  const raw = {
    name: String(formData.get("name") ?? ""),
    brandId: String(formData.get("brandId") ?? ""),
    newBrand: String(formData.get("newBrand") ?? ""),
    model: String(formData.get("model") ?? ""),
    surfaces: formData.getAll("surfaces").map(String),
    priceCents: parseEuros(formData.get("price")),
    compareAtCents: parseEuros(formData.get("compareAt")),
    costCents: parseEuros(formData.get("cost")),
    description: String(formData.get("description") ?? ""),
    leadTime: String(formData.get("leadTime") ?? DEFAULT_LEAD_TIME),
    tags: formData.getAll("tags").map(String),
    status: String(formData.get("status") ?? "draft"),
    allowBackorder: formData.get("allowBackorder") === "on",
    sizes: readJson<{ size: string; stock: number }[]>(formData.get("sizes"), []),
    images: readJson<string[]>(formData.get("images"), []),
  };
  const parsed = productInput.safeParse(raw);
  const errors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      errors[field] ??= issue.message;
    }
  }
  if (raw.brandId === "__new" && !raw.newBrand.trim()) errors.brandId = "Indique le nom de la nouvelle marque";
  else if (!raw.brandId) errors.brandId = "Choisis une marque";
  const sizeNames = raw.sizes.map((s) => String(s.size).trim().replace(",", "."));
  if (new Set(sizeNames).size !== sizeNames.length) errors.sizes = "Une pointure apparaît deux fois";
  if (parsed.success && parsed.data.compareAtCents && parsed.data.compareAtCents <= parsed.data.priceCents)
    errors.compareAtCents = "Le prix barré doit être supérieur au prix de vente";
  if (!parsed.success || Object.keys(errors).length) {
    return { ok: false, errors, message: "Certains champs sont à corriger." };
  }

  const d = parsed.data;
  const brandId = await resolveBrand(d.brandId, d.newBrand);
  const [brand] = await db.select().from(schema.brands).where(eq(schema.brands.id, brandId));
  if (!brand) return { ok: false, errors: { brandId: "Marque introuvable" } };
  const slug = await uniqueSlug(slugify(`${brand.name} ${d.name}`), id ?? undefined);
  const values = {
    slug,
    name: d.name,
    brandId,
    model: d.model || null,
    surfaces: d.surfaces,
    priceCents: d.priceCents,
    compareAtCents: d.compareAtCents,
    ...(admin.role === "owner" ? { costCents: d.costCents } : {}),
    description: d.description,
    leadTime: d.leadTime,
    tags: d.tags,
    status: d.status,
    allowBackorder: d.allowBackorder,
    updatedAt: new Date(),
  };
  const sizes = d.sizes
    .map((s) => ({ size: s.size.replace(",", "."), stock: s.stock }))
    .sort((a, b) => compareSizes(a.size, b.size));

  let productId = id;
  let removedImages: string[] = [];
  await db.transaction(async (tx) => {
    if (productId) {
      const old = await tx.select({ key: schema.productImages.key }).from(schema.productImages).where(eq(schema.productImages.productId, productId));
      removedImages = old.map((o) => o.key).filter((k) => !d.images.includes(k));
      await tx.update(schema.products).set(values).where(eq(schema.products.id, productId));
      await tx.delete(schema.productSizes).where(eq(schema.productSizes.productId, productId));
      await tx.delete(schema.productImages).where(eq(schema.productImages.productId, productId));
    } else {
      // Nouvel article : en tête de liste.
      await tx.update(schema.products).set({ position: sql`${schema.products.position} + 1` });
      const [p] = await tx.insert(schema.products).values({ ...values, position: 0 }).returning({ id: schema.products.id });
      productId = p.id;
    }
    await tx.insert(schema.productSizes).values(sizes.map((s, i) => ({ ...s, productId: productId!, position: i })));
    await tx.insert(schema.productImages).values(d.images.map((key, i) => ({ key, productId: productId!, position: i })));
  });
  await deleteOrphanImages(removedImages);
  expireCatalog();

  if (!id) redirect(`/admin/articles/${productId}?cree=1`);
  refresh();
  return { ok: true, message: "Modifications enregistrées." };
}

/* ---------- Photos ---------- */

export async function uploadProductPhoto(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier reçu." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Photo trop lourde (15 Mo maximum)." };
  if (!file.type.startsWith("image/")) return { error: "Ce fichier n'est pas une image." };
  try {
    const key = await saveProductImage(await file.arrayBuffer());
    return { key, url: imageUrl(key, "sm") };
  } catch (e) {
    console.error(e);
    return { error: "Impossible de lire cette image. Essaie en JPEG ou PNG." };
  }
}

/* ---------- Actions rapides depuis la liste ---------- */

export async function setProductStatus(id: string, status: Status) {
  await requireAdmin();
  if (!STATUSES.includes(status)) return;
  await db.update(schema.products).set({ status, updatedAt: new Date() }).where(eq(schema.products.id, id));
  catalogChanged();
}

export async function updateProductPrice(id: string, euros: string) {
  await requireAdmin();
  const cents = parseEuros(euros);
  if (!cents || Number.isNaN(cents) || cents <= 0) return { error: "Prix invalide" };
  await db.update(schema.products).set({ priceCents: cents, updatedAt: new Date() }).where(eq(schema.products.id, id));
  catalogChanged();
  return { ok: true };
}

export async function updateStocks(id: string, sizes: { size: string; stock: number }[]) {
  await requireAdmin();
  for (const s of sizes) {
    const stock = Math.max(0, Math.floor(Number(s.stock) || 0));
    await db
      .update(schema.productSizes)
      .set({ stock })
      .where(and(eq(schema.productSizes.productId, id), eq(schema.productSizes.size, s.size)));
  }
  catalogChanged();
}

export async function duplicateProduct(id: string) {
  await requireAdmin();
  const [p] = await db.select().from(schema.products).where(eq(schema.products.id, id));
  if (!p) return;
  const [brand] = await db.select().from(schema.brands).where(eq(schema.brands.id, p.brandId));
  const name = `${p.name} (copie)`;
  const slug = await uniqueSlug(slugify(`${brand?.name ?? ""} ${name}`));
  let newId = "";
  await db.transaction(async (tx) => {
    await tx.update(schema.products).set({ position: sql`${schema.products.position} + 1` }).where(sql`${schema.products.position} > ${p.position}`);
    const [copy] = await tx
      .insert(schema.products)
      .values({
        brandId: p.brandId,
        model: p.model,
        surfaces: p.surfaces,
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents,
        costCents: p.costCents,
        description: p.description,
        leadTime: p.leadTime,
        tags: p.tags,
        allowBackorder: p.allowBackorder,
        name,
        slug,
        status: "draft",
        position: p.position + 1,
      })
      .returning({ id: schema.products.id });
    newId = copy.id;
    const sizes = await tx.select().from(schema.productSizes).where(eq(schema.productSizes.productId, id));
    if (sizes.length)
      await tx.insert(schema.productSizes).values(sizes.map((s) => ({ productId: newId, size: s.size, stock: 0, position: s.position })));
    const images = await tx.select().from(schema.productImages).where(eq(schema.productImages.productId, id));
    if (images.length)
      await tx.insert(schema.productImages).values(images.map((i) => ({ productId: newId, key: i.key, position: i.position })));
  });
  expireCatalog();
  redirect(`/admin/articles/${newId}?copie=1`);
}

/** Suppression « douce » : l'article disparaît partout mais les anciennes commandes le gardent. */
export async function deleteProduct(id: string) {
  await requireAdmin();
  await db.update(schema.products).set({ status: "deleted", updatedAt: new Date() }).where(eq(schema.products.id, id));
  catalogChanged();
}

export async function restoreProduct(id: string) {
  await requireAdmin();
  await db.update(schema.products).set({ status: "draft", updatedAt: new Date() }).where(eq(schema.products.id, id));
  catalogChanged();
}

export async function reorderProducts(ids: string[]) {
  await requireAdmin();
  const clean = z.array(z.uuid()).max(2000).parse(ids);
  if (!clean.length) return;
  // Les articles réordonnés reprennent les positions qu'ils occupaient déjà (fonctionne aussi sur une liste filtrée).
  const current = await db
    .select({ id: schema.products.id, position: schema.products.position })
    .from(schema.products)
    .where(inArray(schema.products.id, clean));
  const slots = current.map((c) => c.position).sort((a, b) => a - b);
  await db.transaction(async (tx) => {
    for (const [i, pid] of clean.entries()) {
      await tx.update(schema.products).set({ position: slots[i] ?? i }).where(eq(schema.products.id, pid));
    }
  });
  catalogChanged();
}

/* ---------- Import CSV ---------- */

export type ImportState = { ok?: boolean; message?: string; errors?: string[] } | null;

export async function importCsv(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const admin = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Choisis un fichier CSV." };
  const rows = parseCsv(await file.text());
  const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  const missing = ["nom", "marque", "prix"].filter((c) => !header.includes(c));
  if (missing.length) return { ok: false, message: `Colonnes manquantes : ${missing.join(", ")}. Pars du modèle exporté.` };
  const col = (r: string[], name: (typeof CSV_COLUMNS)[number]) => (header.includes(name) ? (r[header.indexOf(name)] ?? "").trim() : "");

  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  const brands = new Map((await db.select().from(schema.brands)).map((b) => [b.name.toLowerCase(), b.id]));

  for (const [i, r] of rows.entries()) {
    const line = i + 2;
    const name = col(r, "nom");
    const brandName = col(r, "marque");
    const price = parseEuros(col(r, "prix"));
    if (!name || !brandName || !price || Number.isNaN(price)) {
      errors.push(`Ligne ${line} : nom, marque et prix sont obligatoires.`);
      continue;
    }
    const compareAt = parseEuros(col(r, "prix_barre"));
    const cost = parseEuros(col(r, "prix_achat"));
    if (Number.isNaN(compareAt) || Number.isNaN(cost)) {
      errors.push(`Ligne ${line} : prix barré ou prix d'achat invalide.`);
      continue;
    }
    const status = (col(r, "statut") || "draft") as Status;
    if (!STATUSES.includes(status)) {
      errors.push(`Ligne ${line} : statut « ${status} » inconnu (${STATUSES.join(", ")}).`);
      continue;
    }
    const sizes: { size: string; stock: number }[] = [];
    let sizesOk = true;
    for (const part of col(r, "pointures").split("|").filter(Boolean)) {
      const [size, stock] = part.split(":").map((x) => x.trim());
      if (!size || !/^\d+$/.test(stock ?? "0")) sizesOk = false;
      else sizes.push({ size: size.replace(",", "."), stock: Number(stock ?? 0) });
    }
    if (!sizesOk) {
      errors.push(`Ligne ${line} : pointures au format « 40:2|41:5 » attendues.`);
      continue;
    }
    let brandId = brands.get(brandName.toLowerCase());
    if (!brandId) {
      const [b] = await db.insert(schema.brands).values({ name: brandName, position: brands.size }).returning();
      brandId = b.id;
      brands.set(brandName.toLowerCase(), b.id);
    }
    const values = {
      name,
      brandId,
      model: col(r, "modele") || null,
      surfaces: col(r, "terrains").split("|").map((s) => s.trim().toUpperCase()).filter((s) => (SURFACE_CODES as string[]).includes(s)),
      priceCents: price,
      compareAtCents: compareAt,
      ...(admin.role === "owner" ? { costCents: cost } : {}),
      leadTime: col(r, "delai") || DEFAULT_LEAD_TIME,
      tags: col(r, "tags").split("|").map((s) => s.trim()).filter((t) => TAG_CODES.includes(t)),
      status,
      allowBackorder: ["oui", "1", "true", "vrai"].includes(col(r, "sur_commande").toLowerCase()),
      description: col(r, "description"),
      updatedAt: new Date(),
    };
    const slugIn = col(r, "slug");
    const [existing] = slugIn ? await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, slugIn)) : [];
    await db.transaction(async (tx) => {
      let pid = existing?.id;
      if (pid) {
        await tx.update(schema.products).set(values).where(eq(schema.products.id, pid));
        updated++;
      } else {
        const slug = await uniqueSlug(slugIn || slugify(`${brandName} ${name}`));
        const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${schema.products.position}), 0)`.mapWith(Number) }).from(schema.products);
        const [p] = await tx.insert(schema.products).values({ ...values, slug, position: max + 1 }).returning({ id: schema.products.id });
        pid = p.id;
        created++;
      }
      if (sizes.length) {
        await tx.delete(schema.productSizes).where(eq(schema.productSizes.productId, pid));
        await tx.insert(schema.productSizes).values(
          sizes.sort((a, b) => compareSizes(a.size, b.size)).map((s, position) => ({ ...s, productId: pid!, position })),
        );
      }
    });
  }
  if (created || updated) catalogChanged();
  return {
    ok: errors.length === 0,
    message: `${created} article(s) créé(s), ${updated} mis à jour.${created ? " Les nouveaux articles n'ont pas encore de photo : ajoute-les depuis leur fiche." : ""}`,
    errors,
  };
}
