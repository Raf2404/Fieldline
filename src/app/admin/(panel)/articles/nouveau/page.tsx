import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listBrands } from "@/lib/admin-data";
import { getSettings } from "@/lib/settings";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "Nouvel article" };

export default async function NewProductPage() {
  const admin = await requireAdmin();
  const [brands, settings] = await Promise.all([listBrands(), getSettings()]);
  return (
    <ProductForm
      brands={brands}
      showCost={admin.role === "owner"}
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
        leadTime: settings.defaultLeadTime,
        tags: [],
        status: "online",
        allowBackorder: false,
        sizes: [],
        images: [],
      }}
    />
  );
}
