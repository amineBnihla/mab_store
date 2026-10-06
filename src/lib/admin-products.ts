/**
 * Catalog reads and writes for the admin area. Callers must have passed
 * `requireAdmin()`; nothing here checks the user. Storefront reads stay in
 * src/lib/products.ts.
 */
import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { PG_CHECK_VIOLATION, PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION, pgCode, UUID_RE } from "@/lib/pg-error";

export type AdminProductSummary = {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  image: string;
  stock: number;
  updatedAt: Date;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string[];
  priceCents: number;
  imageUrl: string;
  badge: string | null;
  stock: number;
  categoryId: string;
};

export type AdminCategory = { id: string; slug: string; name: string; productCount: number };

/** Fields an admin edits on a product. Stock is managed separately (see `setStock`). */
export type ProductInput = {
  slug: string;
  name: string;
  description: string;
  details: string[];
  priceCents: number;
  imageUrl: string;
  badge: string | null;
  categoryId: string;
};

export async function listAdminProducts(): Promise<AdminProductSummary[]> {
  return db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      category: categories.name,
      priceCents: products.priceCents,
      image: products.imageUrl,
      stock: products.stockQuantity,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.name));
}

/** `undefined` for an unknown or malformed id (a bad uuid would otherwise throw). */
export async function getAdminProduct(id: string): Promise<AdminProduct | undefined> {
  if (!UUID_RE.test(id)) return undefined;
  const [row] = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      details: products.details,
      priceCents: products.priceCents,
      imageUrl: products.imageUrl,
      badge: products.badge,
      stock: products.stockQuantity,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return row;
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}

export type WriteResult<Reason extends string = never> = { ok: true } | { ok: false; reason: Reason };

export async function createProduct(
  input: ProductInput & { stock: number },
): Promise<{ ok: true; id: string } | { ok: false; reason: "slug" | "category" }> {
  const { stock, ...fields } = input;
  try {
    const [row] = await db
      .insert(products)
      .values({ ...fields, stockQuantity: stock })
      .returning({ id: products.id });
    return { ok: true, id: row.id };
  } catch (error) {
    const code = pgCode(error);
    if (code === PG_UNIQUE_VIOLATION) return { ok: false, reason: "slug" };
    if (code === PG_FOREIGN_KEY_VIOLATION) return { ok: false, reason: "category" };
    throw error;
  }
}

export async function updateProduct(id: string, input: ProductInput): Promise<WriteResult<"slug" | "category" | "not-found">> {
  try {
    const updated = await db.update(products).set(input).where(eq(products.id, id)).returning({ id: products.id });
    return updated.length ? { ok: true } : { ok: false, reason: "not-found" };
  } catch (error) {
    const code = pgCode(error);
    if (code === PG_UNIQUE_VIOLATION) return { ok: false, reason: "slug" };
    if (code === PG_FOREIGN_KEY_VIOLATION) return { ok: false, reason: "category" };
    throw error;
  }
}

export async function createCategory(input: { slug: string; name: string }): Promise<WriteResult<"slug">> {
  try {
    await db.insert(categories).values(input);
    return { ok: true };
  } catch (error) {
    if (pgCode(error) === PG_UNIQUE_VIOLATION) return { ok: false, reason: "slug" };
    throw error;
  }
}

/** Only the name changes; the slug is part of storefront URLs. */
export async function renameCategory(id: string, name: string): Promise<WriteResult<"not-found">> {
  const updated = await db.update(categories).set({ name }).where(eq(categories.id, id)).returning({ id: categories.id });
  return updated.length ? { ok: true } : { ok: false, reason: "not-found" };
}

/** Fails with `in-use` while products still point at the category (FK is `restrict`). */
export async function deleteCategory(id: string): Promise<WriteResult<"in-use">> {
  try {
    await db.delete(categories).where(eq(categories.id, id));
    return { ok: true };
  } catch (error) {
    if (pgCode(error) === PG_FOREIGN_KEY_VIOLATION) return { ok: false, reason: "in-use" };
    throw error;
  }
}

/** Absolute overwrite. Checkout holds stock in this same column, so prefer `adjustStock` for restocking. */
export async function setStock(id: string, quantity: number): Promise<WriteResult<"not-found">> {
  const updated = await db
    .update(products)
    .set({ stockQuantity: quantity })
    .where(eq(products.id, id))
    .returning({ id: products.id });
  return updated.length ? { ok: true } : { ok: false, reason: "not-found" };
}

/** Atomic relative change; refuses to go below zero. */
export async function adjustStock(id: string, delta: number): Promise<WriteResult<"below-zero" | "not-found">> {
  try {
    const updated = await db
      .update(products)
      .set({ stockQuantity: sql`${products.stockQuantity} + ${delta}` })
      .where(sql`${products.id} = ${id} and ${products.stockQuantity} + ${delta} >= 0`)
      .returning({ id: products.id });
    if (updated.length) return { ok: true };
  } catch (error) {
    if (pgCode(error) !== PG_CHECK_VIOLATION) throw error;
    return { ok: false, reason: "below-zero" };
  }
  // No row matched: either the product is gone or the change would go negative.
  const exists = await getAdminProduct(id);
  return { ok: false, reason: exists ? "below-zero" : "not-found" };
}
