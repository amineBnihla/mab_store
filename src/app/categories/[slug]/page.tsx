import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/product-card";
import { getCategories, getCategoryBySlug, getProductsByCategorySlug } from "@/lib/products";

// Product data comes from the database; refresh the prerendered page at most every minute.
export const revalidate = 60;

export async function generateStaticParams() {
  return (await getCategories()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) return {};
  return {
    title: category.name,
    description: `Discover ${category.name.toLowerCase()} from the latest collection.`,
  };
}

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [allCategories, products] = await Promise.all([
    getCategories(),
    getProductsByCategorySlug(slug),
  ]);

  return (
    <>
      <header className="container-page pt-12 pb-8 text-center md:pt-16 md:pb-10">
        <p className="text-eyebrow mb-2">Collection</p>
        <h1 className="font-display text-3xl md:text-4xl">{category.name}</h1>
        {products.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </p>
        )}
      </header>

      {/* Swipeable on small screens, centred once every category fits. The
          hairline is an inset shadow so the active tab's border paints over it. */}
      <nav aria-label="Categories" className="mb-8 border-t md:mb-10">
        <ul className="scrollbar-none flex gap-6 overflow-x-auto px-gutter shadow-[inset_0_-1px_0_var(--line)] md:justify-center">
          {allCategories.map((item) => {
            const current = item.slug === category.slug;
            return (
              <li key={item.slug} className="shrink-0">
                <Link
                  href={`/categories/${item.slug}`}
                  aria-current={current ? "page" : undefined}
                  className={`text-nav block border-b py-4 transition-colors ${
                    current
                      ? "border-line-strong"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {products.length > 0 ? (
        <section aria-label={category.name} className="grid-products">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : (
        <div className="container-page space-y-6 text-center">
          <p className="text-sm text-muted-foreground">
            New pieces are on their way. Check back soon.
          </p>
          <Link href="/new" className="btn btn-outline">
            Shop new arrivals
          </Link>
        </div>
      )}

      <nav aria-label="Breadcrumb" className="container-page pt-12 pb-10 md:pt-16">
        <ol className="flex flex-wrap justify-center gap-1.5 text-2xs">
          <li>
            <Link href="/" className="link">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-muted-foreground">
            {category.name}
          </li>
        </ol>
      </nav>
    </>
  );
}
