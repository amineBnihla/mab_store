// Pure bag logic: parsing the untrusted cookie, clamping to stock and pricing.
// No DB or Next imports, so it runs under `npm test`. Server wiring lives in
// src/lib/cart.ts.

/** One bag line as stored in the cookie: intent only, never price or stock. */
export type BagEntry = { id: string; q: number };

/** Most distinct products a bag holds; keeps the cookie well under 4 KB. */
export const MAX_LINES = 50;
/** Most units of one product per line. */
export const MAX_QTY_PER_LINE = 20;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isProductId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isQuantity(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_QTY_PER_LINE;
}

/**
 * Bag entries from the raw cookie value. Anything malformed is dropped rather
 * than rejected: bad JSON, non-uuid ids, non-positive or fractional quantities.
 * Duplicate ids merge, quantities cap at MAX_QTY_PER_LINE, lines at MAX_LINES.
 */
export function parseBag(raw: string | undefined): BagEntry[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const quantities = new Map<string, number>();
  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const { id, q } = item as Record<string, unknown>;
    if (!isProductId(id) || !Number.isInteger(q) || (q as number) < 1) continue;
    const key = id.toLowerCase();
    if (!quantities.has(key) && quantities.size >= MAX_LINES) continue;
    quantities.set(key, Math.min((quantities.get(key) ?? 0) + (q as number), MAX_QTY_PER_LINE));
  }
  return [...quantities].map(([id, q]) => ({ id, q }));
}

export function serializeBag(entries: BagEntry[]): string {
  return JSON.stringify(entries.slice(0, MAX_LINES).map(({ id, q }) => ({ id, q })));
}

/** `requested` limited to what's in stock (and the per-line cap). */
export function clampQuantity(requested: number, stock: number) {
  const quantity = Math.max(0, Math.min(requested, stock, MAX_QTY_PER_LINE));
  return { quantity, clamped: quantity < requested };
}

/** Entries with `id` set to `q`; `q` of 0 removes the line. New lines go last. */
export function setEntry(entries: BagEntry[], id: string, q: number): BagEntry[] {
  const key = id.toLowerCase();
  const exists = entries.some((entry) => entry.id === key);
  if (q <= 0) return entries.filter((entry) => entry.id !== key);
  if (exists) return entries.map((entry) => (entry.id === key ? { id: key, q } : entry));
  return [...entries, { id: key, q }];
}

/** The product fields the bag needs, read live from the database. */
export type BagProduct = { id: string; priceCents: number; stock: number };

export type BagLineStatus = "ok" | "reduced" | "sold-out";

export type BagLine<P extends BagProduct = BagProduct> = {
  product: P;
  /** What the shopper asked for (from the cookie). */
  requested: number;
  /** What can actually be bought now: `min(requested, stock)`. */
  quantity: number;
  lineTotalCents: number;
  status: BagLineStatus;
};

/**
 * Bag lines priced at today's price and limited to today's stock. Entries whose
 * product no longer exists are dropped; sold-out lines stay (so the shopper
 * sees why) but count zero towards the subtotal.
 */
export function reconcileBag<P extends BagProduct>(entries: BagEntry[], products: P[]) {
  const byId = new Map(products.map((product) => [product.id.toLowerCase(), product]));
  const lines: BagLine<P>[] = [];

  for (const entry of entries) {
    const product = byId.get(entry.id);
    if (!product) continue;
    const { quantity, clamped } = clampQuantity(entry.q, product.stock);
    lines.push({
      product,
      requested: entry.q,
      quantity,
      lineTotalCents: product.priceCents * quantity,
      status: quantity === 0 ? "sold-out" : clamped ? "reduced" : "ok",
    });
  }

  return {
    lines,
    subtotalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}
