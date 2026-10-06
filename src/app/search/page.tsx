import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { SearchForm } from "@/components/search-form";
import { getCategories, searchProducts } from "@/lib/products";

/** First `q` param, trimmed; empty when absent. */
async function getQuery(searchParams: PageProps<"/search">["searchParams"]) {
  const { q } = await searchParams;
  return (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
}

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const query = await getQuery(searchParams);
  return {
    title: query ? `Search results for “${query}”` : "Search",
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const query = await getQuery(searchParams);
  const [products, allCategories] = await Promise.all([
    searchProducts(query),
    getCategories(),
  ]);

  return (
    <>
      <header className="container-page pt-12 pb-8 text-center md:pt-16 md:pb-10">
        <p className="text-eyebrow mb-2">Search</p>
        <h1 className="font-display text-3xl md:text-4xl">
          {query ? <>&ldquo;{query}&rdquo;</> : "What are you looking for?"}
        </h1>
        {query && (
          <p className="mt-3 text-xs text-muted-foreground" role="status">
            {products.length} {products.length === 1 ? "result" : "results"}
          </p>
        )}
        <div className="mx-auto mt-8 max-w-form text-left">
          <SearchForm defaultValue={query} autoFocus={!query} />
        </div>
      </header>

      {products.length > 0 ? (
        <section aria-label="Search results" className="grid-products pb-section">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : (
        <div className="container-page space-y-8 pb-section text-center">
          {query && (
            <p className="text-sm text-muted-foreground">
              No pieces match your search. Try another word, or browse a collection.
            </p>
          )}
          <nav aria-label="Categories">
            <p className="text-eyebrow mb-4">Browse by category</p>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3">
              {allCategories.map((category) => (
                <li key={category.slug}>
                  <Link href={`/categories/${category.slug}`} className="text-nav link-quiet">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link href="/new" className="btn btn-outline">
            Shop new arrivals
          </Link>
        </div>
      )}
    </>
  );
}
