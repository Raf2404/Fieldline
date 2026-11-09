import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listBrands } from "@/lib/admin-data";
import { DEFAULT_LEAD_TIME } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "Nouvel article" };

export default async function NewProductPage() {
  await requireAdmin();
  const brands = await listBrands();
  return (
    <ProductForm
      brands={brands}
      product={{
        id: null,
        slug: null,
        name: "",
        brandId: "",
        model: "",
        surfaces: [],
        priceCents: null,
        compareAtCents: null,
        costCents: null,
        description: "",
        leadTime: DEFAULT_LEAD_TIME,
        tags: [],
        status: "online",
        allowBackorder: false,
        sizes: [],
        images: [],
      }}
    />
  );
}
