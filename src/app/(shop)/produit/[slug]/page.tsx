import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/gallery";
import { ShieldIcon, LockIcon } from "@/components/icons";
import { AvailabilityPill, Price } from "@/components/product-card";
import { SizePicker } from "@/components/size-picker";
import { SURFACES } from "@/lib/catalog";
import { getPublicProduct } from "@/lib/queries";
import { RichText } from "@/lib/rich-text";
import { SITE } from "@/lib/site";
import { imageUrl } from "@/lib/storage";

export async function generateMetadata({ params }: PageProps<"/produit/[slug]">): Promise<Metadata> {
  const p = await getPublicProduct((await params).slug);
  if (!p) return {};
  const title = `${p.brand} ${p.name}`;
  return {
    title,
    description: `${title} authentiques à prix réduit. Livraison suivie en ${p.leadTime}. Réservation en ligne en 2 minutes.`,
    openGraph: { title, images: p.images[0] ? [imageUrl(p.images[0], "lg")] : [] },
  };
}

export default function ProductPage({ params }: PageProps<"/produit/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <Product params={params} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-12 lg:grid-cols-[1.1fr_1fr]">
      <div className="aspect-square animate-pulse rounded-3xl bg-black/5" />
      <div className="space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded bg-black/5" />
        <div className="h-6 w-1/3 animate-pulse rounded bg-black/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-black/5" />
      </div>
    </div>
  );
}

async function Product({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPublicProduct((await params).slug);
  if (!p) notFound();

  const title = `${p.brand} ${p.name}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    brand: { "@type": "Brand", name: p.brand },
    image: p.images.map((k) => imageUrl(k, "lg")),
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: (p.priceCents / 100).toFixed(2),
      availability:
        p.availability.kind === "out"
          ? "https://schema.org/OutOfStock"
          : p.availability.kind === "soon"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/InStock",
      url: `${SITE.url}/produit/${p.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-4 text-sm text-muted">
        <Link href="/catalogue" className="hover:text-ink">Catalogue</Link> <span className="mx-1">/</span>{" "}
        <Link href={`/catalogue?marque=${encodeURIComponent(p.brand)}`} className="hover:text-ink">{p.brand}</Link>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <Gallery images={p.images.map((k) => ({ sm: imageUrl(k, "sm"), lg: imageUrl(k, "lg") }))} alt={title} />
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">{p.brand}{p.model ? ` · ${p.model}` : ""}</p>
            <h1 className="text-3xl font-black uppercase leading-none tracking-tight">{p.name}</h1>
            <Price price={p.priceCents} compareAt={p.compareAtCents} size="lg" />
            {p.compareAtCents && p.compareAtCents > p.priceCents && (
              <p className="text-xs text-muted">Prix barré : prix de vente conseillé constaté en magasin.</p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <AvailabilityPill a={p.availability} />
              {p.surfaces.map((s) => (
                <span key={s} className="rounded-full border border-line px-2 py-0.5 text-xs" title={SURFACES.find((x) => x.code === s)?.label}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <SizePicker productId={p.id} status={p.status} allowBackorder={p.allowBackorder} sizes={p.sizes} leadTime={p.leadTime} />

          <ul className="grid gap-2 text-sm text-muted">
            <li className="flex items-center gap-2"><ShieldIcon className="size-5 text-ink" /> Produit authentique, neuf, en boîte d&apos;origine</li>
            <li className="flex items-center gap-2"><LockIcon className="size-5 text-ink" /> Paire réservée dès ta commande, paiement ensuite sur WhatsApp</li>
          </ul>

          {p.description && (
            <section className="border-t border-line pt-5 text-[15px] leading-relaxed">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Description</h2>
              <RichText text={p.description} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
