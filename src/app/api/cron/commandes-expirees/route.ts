import { expireUnpaidOrders } from "@/lib/order-service";
import { expireCatalog } from "@/lib/revalidate";

// Appelée par Vercel Cron (voir vercel.json) ou un service externe, avec l'en-tête Authorization: Bearer CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const cancelled = await expireUnpaidOrders();
  if (cancelled) expireCatalog(false);
  return Response.json({ cancelled });
}
