import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/money";
import { dateFr } from "@/lib/orders";
import { promoLabel, promoUses } from "@/lib/promo";
import { PromoCreate, PromoRowActions } from "./promo-ui";

export const metadata: Metadata = { title: "Codes promo" };

export default async function PromosPage() {
  await requireAdmin();
  const promos = await db.select().from(schema.promoCodes).orderBy(desc(schema.promoCodes.createdAt));
  const uses = await Promise.all(promos.map((p) => promoUses(p.code)));
  const now = new Date().getTime();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Codes promo</h1>
      <PromoCreate />
      {promos.length ? (
        <ul className="space-y-2">
          {promos.map((p, i) => {
            const expired = p.endsAt && p.endsAt.getTime() < now;
            const full = p.maxUses != null && uses[i] >= p.maxUses;
            const live = p.active && !expired && !full;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4">
                <span className="font-mono text-base font-bold">{p.code}</span>
                <span className="rounded-full bg-orange px-2 py-0.5 text-xs font-bold text-ink">{promoLabel(p)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${live ? "bg-ok/10 text-ok" : "bg-black/5 text-muted"}`}>
                  {live ? "Actif" : !p.active ? "Désactivé" : expired ? "Expiré" : "Épuisé"}
                </span>
                <span className="flex-1 text-xs text-muted">
                  {uses[i]} utilisation{uses[i] > 1 ? "s" : ""}{p.maxUses != null && ` / ${p.maxUses}`}
                  {p.endsAt && ` · jusqu'au ${dateFr(p.endsAt)}`}
                  {p.minSubtotalCents ? ` · dès ${formatPrice(p.minSubtotalCents)}` : ""}
                </span>
                <PromoRowActions id={p.id} active={p.active} code={p.code} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">Aucun code pour l&apos;instant.</p>
      )}
      <p className="text-xs text-muted">Une commande annulée ou remboursée libère son utilisation du code.</p>
    </div>
  );
}
