// Stockage des photos. Production : Supabase Storage (bucket public). Local : dossier .data/uploads.
// Volontairement sans "server-only" pour être utilisable par les scripts (seed, import).
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export const IMAGE_VARIANTS = { sm: 480, lg: 1400 } as const;
export type Variant = keyof typeof IMAGE_VARIANTS;

const LOCAL_DIR = path.join(process.cwd(), ".data", "uploads");

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key, bucket: process.env.SUPABASE_BUCKET || "products" };
}

export function imageUrl(key: string, variant: Variant) {
  const file = `${key}-${variant}.webp`;
  const sb = supabase();
  if (sb) return `${sb.url}/storage/v1/object/public/${sb.bucket}/${file}`;
  return `/media/${file}`;
}

async function put(file: string, body: Buffer) {
  const sb = supabase();
  if (sb) {
    const res = await fetch(`${sb.url}/storage/v1/object/${sb.bucket}/${file}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sb.key}`,
        "Content-Type": "image/webp",
        "Cache-Control": "31536000",
        "x-upsert": "true",
      },
      body: new Uint8Array(body),
    });
    if (!res.ok) throw new Error(`Envoi de la photo impossible (${res.status}) : ${await res.text()}`);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("Stockage des photos non configuré : renseigne SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sur Vercel.");
  }
  const target = path.join(LOCAL_DIR, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
}

async function remove(files: string[]) {
  const sb = supabase();
  if (sb) {
    await fetch(`${sb.url}/storage/v1/object/${sb.bucket}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${sb.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: files }),
    });
    return;
  }
  await Promise.all(files.map((f) => unlink(path.join(LOCAL_DIR, f)).catch(() => {})));
}

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Redimensionne une photo (toutes tailles, tous formats courants) et l'enregistre. Renvoie sa clé. */
export async function saveProductImage(input: Buffer | ArrayBuffer): Promise<string> {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const key = `p/${randomUUID()}`;
  await Promise.all(
    (Object.entries(IMAGE_VARIANTS) as [Variant, number][]).map(async ([variant, width]) => {
      const out = await sharp(buf)
        .rotate() // respecte l'orientation des photos de téléphone
        .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
        .webp({ quality: variant === "sm" ? 76 : 82 })
        .toBuffer();
      await put(`${key}-${variant}.webp`, out);
    }),
  );
  return key;
}

export async function deleteProductImage(key: string) {
  await remove(Object.keys(IMAGE_VARIANTS).map((v) => `${key}-${v}.webp`));
}

/** Lecture locale (route /media) ; n'est utilisée que sans Supabase. */
export async function readLocalFile(file: string) {
  const resolved = path.resolve(LOCAL_DIR, file);
  if (!resolved.startsWith(LOCAL_DIR + path.sep)) return null;
  return readFile(resolved).catch(() => null);
}
