import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Première barrière de l'admin : sans session valide, redirection immédiate vers la connexion.
// Chaque page et chaque action revérifient ensuite le compte en base (requireAdmin).
export async function proxy(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  const secret = process.env.SESSION_SECRET;
  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
      return NextResponse.next();
    } catch {}
  }
  if (request.nextUrl.pathname.startsWith("/admin/articles/export")) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/connexion", request.url));
}

export const config = {
  matcher: ["/admin", "/admin/((?!connexion).*)"],
};
