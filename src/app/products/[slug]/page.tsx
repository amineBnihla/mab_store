import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { ChevronDownIcon, HeartIcon, PhoneIcon, PinIcon, PlusIcon } from "@/components/icons";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductRail } from "@/components/product/product-rail";
import { StockStatus } from "@/components/product/stock-status";
import { formatPrice, services } from "@/lib/catalog";
import {
  getAllProductSlugs,
  getProductBySlug,
  getProductImages,
  getRelatedProducts,
} from "@/lib/products";
import { site } from "@/lib/site";

// Stock changes often; refresh the prerendered page at most every minute.
export const revalidate = 60;

export async function generateStaticParams() {
  return getAllProductSlugs();
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  return { title: product.name, description: product.description };
}

const accordionSummary =
  "flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-medium [&::-webkit-details-marker]:hidden";

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const soldOut = product.stock <= 0;
  const related = await getRelatedProducts(product, 8);

  return (
    <>
      <ProductGallery images={getProductImages(product)} alt={product.name} />

      {/* Mobile order: summary → purchase → description. From tablet the
          purchase panel moves to its own sticky right-hand column. */}
      <div className="container-page grid gap-10 pt-8 md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-x-[clamp(3rem,8vw,7.5rem)] md:gap-y-12 md:pt-12">
        <div className="space-y-2">
          {product.badge && (
            <p className="text-2xs font-medium tracking-eyebrow uppercase">{product.badge}</p>
          )}
          <div className="flex items-start justify-between gap-4">
            <h1 className="pt-1.5 text-lg">{product.name}</h1>
            <button
              type="button"
              className="btn-icon -mr-2.5 shrink-0"
              aria-label={`Save ${product.name} to wishlist`}
            >
              <HeartIcon />
            </button>
          </div>
          <p className="text-base font-medium">{formatPrice(product.priceCents)}</p>
        </div>

        <aside
          aria-label="Purchase"
          className="space-y-8 md:sticky md:top-[calc(var(--spacing-header)+2rem)] md:col-start-2 md:row-span-2 md:row-start-1 md:self-start"
        >
          <div className="space-y-4">
            <StockStatus stock={product.stock} />
            <AddToBagButton productId={product.id} soldOut={soldOut} />
          </div>

          <ul className="space-y-5 text-xs">
            <li className="space-y-1">
              <Link href="/contact" className="link inline-flex items-center gap-2">
                <PhoneIcon width={14} height={14} />
                Contact us
              </Link>
              <p className="text-muted-foreground">Our client advisors are available to help you.</p>
            </li>
            <li>
              <Link href="/boutiques" className="link inline-flex items-center gap-2">
                <PinIcon width={14} height={14} />
                Find in store and book an appointment
              </Link>
            </li>
            <li className="space-y-1">
              <p className="inline-flex items-center gap-2 font-medium">
                <PlusIcon width={14} height={14} />
                {site.name} services
              </p>
              <p className="text-muted-foreground">
                {services.map((service) => service.title).join(", ")}.
              </p>
            </li>
          </ul>
        </aside>

        <div className="space-y-10">
          <section className="space-y-3">
            <h2 className="text-title text-sm">Product description</h2>
            <p className="text-2xs text-muted-foreground">Category: {product.category}</p>
            <p className="max-w-prose text-base">{product.description}</p>
          </section>

          <div className="border-t">
            <details className="group border-b open:border-line-strong" open>
              <summary className={accordionSummary}>
                Product details
                <ChevronDownIcon width={16} height={16} className="transition-transform group-open:rotate-180" />
              </summary>
              <ul className="list-disc space-y-1 pb-6 pl-5 text-sm">
                {product.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </details>
            <details className="group border-b open:border-line-strong">
              <summary className={accordionSummary}>
                Delivery &amp; returns
                <ChevronDownIcon width={16} height={16} className="transition-transform group-open:rotate-180" />
              </summary>
              <ul className="space-y-4 pb-6 text-sm">
                {services.map((service) => (
                  <li key={service.title}>
                    <p>{service.title}</p>
                    <p className="text-muted-foreground">{service.body}</p>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="pt-section">
          <h2 id="related-heading" className="text-title mb-8 px-gutter text-center text-xl md:mb-10 md:text-2xl">
            You may also like
          </h2>
          <ProductRail products={related} label="Recommended products" />
        </section>
      )}

      <nav aria-label="Breadcrumb" className="container-page pt-12 pb-10 md:pt-16">
        <ol className="flex flex-wrap justify-center gap-1.5 text-2xs">
          <li>
            <Link href="/" className="link">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/categories/${product.categorySlug}`} className="link">
              {product.category}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-muted-foreground">
            {product.name}
          </li>
        </ol>
      </nav>
    </>
  );
}
