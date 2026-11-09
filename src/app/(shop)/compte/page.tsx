import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCustomer } from "@/lib/customer-auth";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS, dateFr, dayFr, formatPhone, orderRef, type OrderStatusCode } from "@/lib/orders";
import { imageUrl } from "@/lib/storage";
import { logout } from "./actions";
import { DeleteAccount, ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-black/5" />}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  const customer = await getCustomer();
  if (!customer) redirect("/compte/connexion");
  const orders = await db.select().from(schema.orders).where(eq(schema.orders.email, customer.email)).orderBy(desc(schema.orders.createdAt));
  const items = orders.length
    ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, orders.map((o) => o.id)))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight">Mon compte</h1>
          <p className="text-muted">{customer.firstName ? `Salut ${customer.firstName} ! ` : ""}{customer.email}</p>
        </div>
        <form action={logout}><button className="btn-secondary btn-sm">Se déconnecter</button></form>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Mes commandes</h2>
        {orders.length ? (
          <ul className="space-y-2">
            {orders.map((o) => {
              const st = ORDER_STATUS[o.status as OrderStatusCode];
              const its = items.filter((i) => i.orderId === o.id);
              return (
                <li key={o.id}>
                  <Link href={`/commande/${o.token}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 transition hover:ring-2 hover:ring-ink/10">
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-paper">
                      {its[0]?.imageKey && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl(its[0].imageKey, "sm")} alt="" className="size-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{orderRef(o.number)}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.tone}`}>{st.label}</span>
                      </div>
                      <p className="truncate text-sm text-muted">{its.map((i) => `${i.brand} ${i.productName} (${i.size})`).join(" · ")}</p>
                      <p className="text-xs text-muted">
                        {dateFr(o.createdAt)}
                        {o.estimatedDeliveryAt && !["delivered", "cancelled", "refunded"].includes(o.status) && ` · livraison estimée ${dayFr(o.estimatedDeliveryAt)}`}
                      </p>
                    </div>
                    <span className="font-semibold">{formatPrice(o.totalCents)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">
            Aucune commande pour l&apos;instant. <Link href="/catalogue" className="font-semibold text-ink underline">Voir le catalogue</Link>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Mes informations</h2>
        <p className="text-sm text-muted">Elles pré-remplissent ta prochaine commande.</p>
        <ProfileForm
          customer={{
            firstName: customer.firstName ?? "",
            lastName: customer.lastName ?? "",
            phone: customer.phone ? formatPhone(customer.phone) : "",
            address1: customer.address1 ?? "",
            address2: customer.address2 ?? "",
            postalCode: customer.postalCode ?? "",
            city: customer.city ?? "",
          }}
        />
      </section>

      <section className="rounded-2xl border border-line p-5">
        <h2 className="font-semibold">Supprimer mon compte</h2>
        <p className="mt-1 text-sm text-muted">
          Tes informations personnelles sont effacées. Les commandes déjà passées restent conservées pour nos obligations légales.
        </p>
        <DeleteAccount />
      </section>
    </div>
  );
}
