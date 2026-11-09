import { readLocalFile } from "@/lib/storage";

// Sert les photos rangées en local (.data/uploads) quand Supabase Storage n'est pas configuré.
export async function GET(_req: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params;
  const file = await readLocalFile(path.join("/"));
  if (!file) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
