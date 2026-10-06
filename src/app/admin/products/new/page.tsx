import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/product-form";
import { listAdminCategories } from "@/lib/admin-products";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "New product · Admin", robots: { index: false } };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await listAdminCategories();

  return (
    <>
      <header className="mb-10">
        <p className="text-eyebrow mb-2 lg:hidden">Admin</p>
        <h1 className="font-display text-3xl md:text-4xl">New product</h1>
      </header>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Create a category first.</p>
      ) : (
        <ProductForm mode="create" categories={categories} />
      )}
    </>
  );
}
