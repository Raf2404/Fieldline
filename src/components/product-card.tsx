import Link from "next/link";
import { availabilityLabel, tagLabel } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/money";
import type { PublicProduct } from "@/lib/queries";
import { imageUrl } from "@/lib/storage";

export function AvailabilityPill({ a }: { a: PublicProduct["availability"] }) {
  const tone =
    a.kind === "available"
      ? "text-ok"
      : a.kind === "low" || a.kind === "backorder"
        ? "text-warn"
        : a.kind === "soon"
          ? "text-ink"
          : "text-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {availabilityLabel(a)}
    </span>
  );
}

export function Price({ price, compareAt, size = "sm" }: { price: number; compareAt: number | null; size?: "sm" | "lg" }) {
  const off = discountPercent(price, compareAt);
  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 ${size === "lg" ? "text-2xl" : "text-base"}`}>
      <span className="font-bold">{formatPrice(price)}</span>
      {off && (
        <>
          <span className={`text-muted line-through ${size === "lg" ? "text-base" : "text-sm"}`}>
            {formatPrice(compareAt!)}
          </span>
          <span className={`rounded-full bg-orange px-1.5 font-bold text-ink ${size === "lg" ? "text-sm" : "text-xs"}`}>-{off} %</span>
        </>
      )}
    </div>
  );
}

export function ProductCard({ p, priority }: { p: PublicProduct; priority?: boolean }) {
  const img = p.images[0];
  const dimmed = p.availability.kind === "out";
  return (
    <Link href={`/produit/${p.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(img, "sm")}
            alt={`${p.brand} ${p.name}`}
            width={480}
            height={480}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            className={`size-full object-cover transition duration-300 group-hover:scale-[1.03] ${dimmed ? "opacity-50" : ""}`}
          />
        ) : (
          <div className="grid size-full place-items-center text-sm text-muted">Pas de photo</div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {p.tags.map((t) => (
            <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t === "promo" ? "bg-orange text-ink" : t === "nouveaute" ? "bg-accent text-ink" : "bg-ink text-white"}`}>
              {tagLabel(t)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2.5 space-y-1 px-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{p.brand}</p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</h3>
        <Price price={p.priceCents} compareAt={p.compareAtCents} />
        <AvailabilityPill a={p.availability} />
      </div>
    </Link>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: PublicProduct[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
      {products.map((p, i) => (
        <ProductCard key={p.id} p={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
