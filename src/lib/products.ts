import "server-only";

import { desc, eq, inArray, ne, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { categories, products } from "@/db/schema";

export type Product = {
  id: string;
  slug: string;
  name: string;
  /** Category display name. */
  category: string;
  categorySlug: string;
  /** Price in euro cents. */
  priceCents: number;
  image: string;
  badge: string | null;
  /** Units available; 0 means sold out. */
  stock: number;
  description: string;
  details: string[];
};

const productColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  category: categories.name,
  categorySlug: categories.slug,
  priceCents: products.priceCents,
  image: products.imageUrl,
  badge: products.badge,
  stock: products.stockQuantity,
  description: products.description,
  details: products.details,
};

function selectProducts() {
  return db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id));
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  return selectProducts().orderBy(desc(products.createdAt)).limit(limit);
}

export async function getProductsByCategorySlugs(slugs: string[], limit = 4): Promise<Product[]> {
  return selectProducts()
    .where(inArray(categories.slug, slugs))
    .orderBy(desc(products.createdAt))
    .limit(limit);
}

/** Cached per request so generateMetadata and the page share one query. */
export const getProductBySlug = cache(async (slug: string): Promise<Product | undefined> => {
  const [row] = await selectProducts().where(eq(products.slug, slug)).limit(1);
  return row;
});

/** Up to `limit` other products, same category first. */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  return selectProducts()
    .where(ne(products.id, product.id))
    .orderBy(desc(sql`${categories.slug} = ${product.categorySlug}`), desc(products.createdAt))
    .limit(limit);
}

export async function getAllProductSlugs() {
  return db.select({ slug: products.slug }).from(products);
}

/** Product-page gallery: the main shot plus a close crop of the same photo. */
export function getProductImages(product: Product) {
  return [product.image, `${product.image}&h=2133&crop=focalpoint&fp-x=0.5&fp-y=0.45&fp-z=1.8`];
}
