import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL manquant : copie .env.example vers .env.local");
}

const isLocal = /@(127\.0\.0\.1|localhost)[:/]/.test(url);

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

const client =
  globalForDb.pg ??
  postgres(url, {
    // Supabase : pooler en mode transaction, d'où prepare: false.
    max: isLocal ? 10 : 5,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
