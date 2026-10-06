/**
 * Admin form validation (pure, no DB). The server actions are authoritative;
 * client forms may reuse these for instant feedback.
 */
import { UUID_RE } from "./pg-error";

export const NAME_MAX = 120;
export const SLUG_MAX = 80;
export const DESCRIPTION_MAX = 2000;
export const BADGE_MAX = 30;
export const DETAIL_MAX = 200;
export const DETAILS_MAX_LINES = 12;
export const PRICE_MAX_CENTS = 10_000_000; // €100,000
export const STOCK_MAX = 100_000;

// Must stay in sync with `images.remotePatterns` in next.config.ts.
export const IMAGE_HOSTS = ["images.unsplash.com"];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE_RE = /^\d+(?:[.,]\d{1,2})?$/;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

export function validateName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return "Enter a name.";
  if (name.length > NAME_MAX) return `Keep the name under ${NAME_MAX} characters.`;
}

export function validateSlug(value: string): string | undefined {
  const slug = value.trim();
  if (!slug) return "Enter a slug.";
  if (slug.length > SLUG_MAX) return `Keep the slug under ${SLUG_MAX} characters.`;
  if (!SLUG_RE.test(slug)) return "Use lowercase letters, numbers and single hyphens.";
}

export function validateDescription(value: string): string | undefined {
  const text = value.trim();
  if (!text) return "Enter a description.";
  if (text.length > DESCRIPTION_MAX) return `Keep the description under ${DESCRIPTION_MAX} characters.`;
}

export function validateBadge(value: string): string | undefined {
  if (value.trim().length > BADGE_MAX) return `Keep the badge under ${BADGE_MAX} characters.`;
}

/** "12.50" / "12,5" / "12" (euros) → integer cents, or an error message. */
export function parsePriceCents(value: string): { cents: number } | { error: string } {
  const text = value.trim();
  if (!text) return { error: "Enter a price." };
  if (!PRICE_RE.test(text)) return { error: "Enter a price like 49 or 49.90." };
  const [whole, frac = ""] = text.replace(",", ".").split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (cents > PRICE_MAX_CENTS) return { error: "That price is too high." };
  return { cents };
}

/** Whole non-negative integer, or an error message. */
export function parseStock(value: string): { quantity: number } | { error: string } {
  const text = value.trim();
  if (!text) return { error: "Enter a quantity." };
  if (!/^\d+$/.test(text)) return { error: "Use a whole number, 0 or more." };
  const quantity = Number(text);
  if (quantity > STOCK_MAX) return { error: `Keep stock under ${STOCK_MAX.toLocaleString("en-IE")}.` };
  return { quantity };
}

/** Whole signed integer for relative stock adjustments. */
export function parseStockDelta(value: string): { delta: number } | { error: string } {
  const text = value.trim();
  if (!/^[+-]?\d+$/.test(text)) return { error: "Use a whole number like 5 or -2." };
  const delta = Number(text);
  if (delta === 0) return { error: "Enter a non-zero change." };
  if (Math.abs(delta) > STOCK_MAX) return { error: `Keep the change under ${STOCK_MAX.toLocaleString("en-IE")}.` };
  return { delta };
}

export function validateImageUrl(value: string): string | undefined {
  const text = value.trim();
  if (!text) return "Enter an image URL.";
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return "Enter a valid URL.";
  }
  if (url.protocol !== "https:") return "The image URL must use https.";
  if (!IMAGE_HOSTS.includes(url.hostname)) return `Images must be hosted on ${IMAGE_HOSTS.join(", ")}.`;
}

/** One detail per line; blanks dropped. Error if too many or too long. */
export function parseDetails(value: string): { details: string[] } | { error: string } {
  const details = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (details.length > DETAILS_MAX_LINES) return { error: `Use at most ${DETAILS_MAX_LINES} lines.` };
  if (details.some((line) => line.length > DETAIL_MAX)) return { error: `Keep each line under ${DETAIL_MAX} characters.` };
  return { details };
}

// --- Whole-form validation --------------------------------------------------

export type ProductField =
  | "name"
  | "slug"
  | "categoryId"
  | "price"
  | "stock"
  | "imageUrl"
  | "badge"
  | "description"
  | "details";

export const PRODUCT_FIELDS: ProductField[] = [
  "name",
  "slug",
  "categoryId",
  "price",
  "stock",
  "imageUrl",
  "badge",
  "description",
  "details",
];

export type ProductFieldErrors = Partial<Record<ProductField, string>>;

export type ParsedProduct = {
  slug: string;
  name: string;
  description: string;
  details: string[];
  priceCents: number;
  imageUrl: string;
  badge: string | null;
  categoryId: string;
  stock: number;
};

/**
 * Validates the raw product form. On create the slug may be left blank (derived
 * from the name) and stock is required; on edit stock isn't part of the form.
 */
export function validateProductForm(
  values: Partial<Record<ProductField, string>>,
  mode: "create" | "edit",
): { errors: ProductFieldErrors } | { product: ParsedProduct } {
  const v = (field: ProductField) => values[field] ?? "";
  const errors: ProductFieldErrors = {};

  const nameError = validateName(v("name"));
  if (nameError) errors.name = nameError;

  const slug = v("slug").trim() || (mode === "create" ? slugify(v("name")) : "");
  const slugError = validateSlug(slug);
  if (slugError) errors.slug = slugError;

  if (!UUID_RE.test(v("categoryId"))) errors.categoryId = "Choose a category.";

  const price = parsePriceCents(v("price"));
  if ("error" in price) errors.price = price.error;

  let stock = 0;
  if (mode === "create") {
    const parsed = parseStock(v("stock"));
    if ("error" in parsed) errors.stock = parsed.error;
    else stock = parsed.quantity;
  }

  const imageError = validateImageUrl(v("imageUrl"));
  if (imageError) errors.imageUrl = imageError;

  const badgeError = validateBadge(v("badge"));
  if (badgeError) errors.badge = badgeError;

  const descriptionError = validateDescription(v("description"));
  if (descriptionError) errors.description = descriptionError;

  const details = parseDetails(v("details"));
  if ("error" in details) errors.details = details.error;

  if (Object.keys(errors).length > 0 || "error" in price || "error" in details) return { errors };
  return {
    product: {
      slug,
      name: v("name").trim(),
      description: v("description").trim(),
      details: details.details,
      priceCents: price.cents,
      imageUrl: v("imageUrl").trim(),
      badge: v("badge").trim() || null,
      categoryId: v("categoryId"),
      stock,
    },
  };
}
