import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getProductForEdit, listBrands } from "@/lib/admin-data";
import { imageUrl } from "@/lib/storage";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "Modifier l'article" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/articles/[id]">) {
  const admin = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [p, brands] = await Promise.all([getProductForEdit(id), listBrands()]);
  if (!p) notFound();
  const notice = sp.cree ? "Article créé." : sp.copie ? "Copie créée en brouillon : adapte le nom, les photos et le stock puis passe-la en ligne." : undefined;
  return (
    <ProductForm
      key={p.id}
      notice={notice}
      showCost={admin.role === "owner"}
      brands={brands}
      product={{ ...p, costCents: admin.role === "owner" ? p.costCents : null, images: p.images.map((key) => ({ key, url: imageUrl(key, "sm") })) }}
    />
  );
}
