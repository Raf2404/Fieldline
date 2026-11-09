import { getAdmin } from "@/lib/auth";
import { listOrders } from "@/lib/admin-orders";
import { toCsv } from "@/lib/csv";
import { centsToInput } from "@/lib/money";
import { ORDER_STATUS, carrierLabel, formatPhone } from "@/lib/orders";

// Export des commandes de l'onglet courant : une ligne par article (comptabilité, commande fournisseur).
export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response("Non autorisé", { status: 401 });
  const url = new URL(req.url);
  const orders = await listOrders(url.searchParams.get("onglet") || "toutes", "");
  const d = (x: Date | null) => (x ? x.toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "");
  const rows = orders.flatMap((o) =>
    o.items.map((i) => [
      o.number, d(o.createdAt), ORDER_STATUS[o.status].label, d(o.paidAt),
      `${o.firstName} ${o.lastName}`, o.email, formatPhone(o.phone),
      [o.address1, o.address2, `${o.postalCode} ${o.city}`].filter(Boolean).join(", "),
      i.brand, i.productName, i.size, i.quantity, centsToInput(i.unitPriceCents),
      o.promoCode ?? "", centsToInput(o.discountCents), centsToInput(o.shippingCents), centsToInput(o.totalCents),
      carrierLabel(o.carrier), o.trackingNumber ?? "", o.internalNote ?? "",
    ]),
  );
  const header = ["commande", "date", "statut", "payée le", "client", "e-mail", "téléphone", "adresse", "marque", "article", "pointure", "quantité", "prix unitaire", "code promo", "remise", "livraison", "total commande", "transporteur", "suivi", "notes internes"];
  return new Response(toCsv([header, ...rows]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
