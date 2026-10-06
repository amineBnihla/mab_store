import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Storefront pages are time-based ISR (`revalidate = 60`) with no cache tags,
 * so catalog writes invalidate by route. Admin pages are dynamic; revalidating
 * their layout also drops the client router cache for them.
 */
export function revalidateCatalog() {
  revalidatePath("/", "page");
  revalidatePath("/new", "page");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/categories/[slug]", "page");
  revalidatePath("/bag", "page");
  revalidatePath("/admin", "layout");
}
