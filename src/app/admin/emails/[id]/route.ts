import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAdmin } from "@/lib/auth";

// Aperçu d'un e-mail tel que le client l'a reçu (admin uniquement).
export async function GET(_req: Request, ctx: RouteContext<"/admin/emails/[id]">) {
  if (!(await getAdmin())) return new Response("Non autorisé", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Introuvable", { status: 404 });
  const [m] = await db.select().from(schema.emails).where(eq(schema.emails.id, id));
  if (!m) return new Response("Introuvable", { status: 404 });
  return new Response(m.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // Le contenu est le nôtre, mais on interdit tout script par précaution.
      "Content-Security-Policy": "default-src 'none'; img-src * data:; style-src 'unsafe-inline'",
    },
  });
}
