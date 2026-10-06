import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { getNewArrivals } from "@/lib/products";

// Product data comes from the database; refresh the prerendered page at most every minute.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "New Arrivals",
  description: "The latest pieces to arrive this season, from ready-to-wear to bags and jewellery.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivals(24);

  return (
    <>
      <header className="container-page pt-12 pb-8 text-center md:pt-16 md:pb-10">
        <p className="text-eyebrow mb-2">New In</p>
        <h1 className="font-display text-3xl md:text-4xl">New Arrivals</h1>
        {products.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </p>
        )}
      </header>

      {products.length > 0 ? (
        <section aria-label="New arrivals" className="grid-products pb-section">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : (
        <div className="container-page space-y-6 pb-section text-center">
          <p className="text-sm text-muted-foreground">New pieces are on their way. Check back soon.</p>
          <Link href="/" className="btn btn-outline">
            Continue shopping
          </Link>
        </div>
      )}
    </>
  );
}
