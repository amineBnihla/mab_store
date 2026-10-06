import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { getAdminProduct, listAdminCategories } from "@/lib/admin-products";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Edit product · Admin", robots: { index: false } };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  const [product, categories] = await Promise.all([getAdminProduct(id), listAdminCategories()]);
  if (!product) notFound();

  return (
    <>
      <header className="mb-10">
        <p className="text-eyebrow mb-2 lg:hidden">Admin</p>
        <h1 className="font-display text-3xl md:text-4xl">{product.name}</h1>
        <p className="mt-3 text-xs text-muted-foreground">
          {product.stock} in stock — change it on the Stock page.
        </p>
      </header>
      <ProductForm
        mode="edit"
        productId={product.id}
        categories={categories}
        initial={{
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          price: (product.priceCents / 100).toFixed(2),
          imageUrl: product.imageUrl,
          badge: product.badge ?? "",
          description: product.description,
          details: product.details.join("\n"),
        }}
      />
    </>
  );
}
