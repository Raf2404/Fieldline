/**
 * Crée (ou met à jour) un compte administrateur.
 * Usage : npm run admin:create -- ton@email.fr "Ton prénom"
 * Le mot de passe est demandé ensuite (12 caractères minimum).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createInterface } from "node:readline/promises";
import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const [email, name = "Admin"] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error('Usage : npm run admin:create -- ton@email.fr "Ton prénom"');
  process.exit(1);
}

async function readPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const pw = await rl.question("Mot de passe (12 caractères min.) : ");
  rl.close();
  return pw;
}

async function main() {
  const password = await readPassword();
  if (password.length < 12) throw new Error("Mot de passe trop court (12 caractères minimum).");
  const client = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  const db = drizzle(client, { schema });
  const passwordHash = await hashPassword(password);
  await db
    .insert(schema.adminUsers)
    .values({ email: email.toLowerCase(), name, passwordHash })
    .onConflictDoUpdate({ target: schema.adminUsers.email, set: { passwordHash, name } });
  await client.end();
  console.log(`✓ Compte admin prêt : ${email.toLowerCase()}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
