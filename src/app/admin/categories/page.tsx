import type { Metadata } from "next";

import { CategoryRow, CreateCategoryForm } from "@/components/admin/category-forms";
import { listAdminCategories } from "@/lib/admin-products";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Categories · Admin", robots: { index: false } };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await listAdminCategories();

  return (
    <>
      <header className="mb-10">
        <p className="text-eyebrow mb-2 lg:hidden">Admin</p>
        <h1 className="font-display text-3xl md:text-4xl">Categories</h1>
      </header>

      <section aria-labelledby="new-category" className="mb-12 max-w-2xl border-t pt-8">
        <h2 id="new-category" className="text-title mb-6 text-xs">
          New category
        </h2>
        <CreateCategoryForm />
      </section>

      <section aria-labelledby="all-categories" className="max-w-2xl">
        <h2 id="all-categories" className="text-title mb-6 border-t pt-8 text-xs">
          All categories
        </h2>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <ul className="border-t">
            {categories.map((c) => (
              <CategoryRow key={c.id} id={c.id} name={c.name} slug={c.slug} productCount={c.productCount} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
