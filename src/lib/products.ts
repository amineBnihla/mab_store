import "server-only";

import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
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

export type Category = {
  slug: string;
  name: string;
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

export async function getProductsByCategorySlug(slug: string, limit = 48): Promise<Product[]> {
  return getProductsByCategorySlugs([slug], limit);
}

/** Categories for navigation, alphabetical. Cached so the page and its category nav share one query. */
export const getCategories = cache(async (): Promise<Category[]> => {
  return db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));
});

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((category) => category.slug === slug);
}

/** Longest query we pass to the database; longer input is truncated. */
const SEARCH_QUERY_MAX_LENGTH = 100;

/**
 * Products matching every word of `query` against name, category or
 * description (case-insensitive). Name matches rank first, then newest.
 */
export async function searchProducts(query: string, limit = 48): Promise<Product[]> {
  const terms = query.trim().slice(0, SEARCH_QUERY_MAX_LENGTH).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  // Escape LIKE wildcards so "%" and "_" match literally.
  const patterns = terms.map((term) => `%${term.replace(/[\\%_]/g, "\\$&")}%`);

  return selectProducts()
    .where(
      and(
        ...patterns.map((pattern) =>
          or(
            ilike(products.name, pattern),
            ilike(categories.name, pattern),
            ilike(products.description, pattern),
          ),
        ),
      ),
    )
    .orderBy(
      desc(and(...patterns.map((pattern) => ilike(products.name, pattern)))!),
      desc(products.createdAt),
    )
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

/**
 * Products for the bag, by id. Deliberately uncached: the bag and its actions
 * must see live price and stock, not the ISR snapshot.
 */
export async function getProductsForBag(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  return selectProducts().where(inArray(products.id, ids));
}

export async function getAllProductSlugs() {
  return db.select({ slug: products.slug }).from(products);
}

/** Product-page gallery: the main shot plus a close crop of the same photo. */
export function getProductImages(product: Product) {
  return [product.image, `${product.image}&h=2133&crop=focalpoint&fp-x=0.5&fp-y=0.45&fp-z=1.8`];
}
