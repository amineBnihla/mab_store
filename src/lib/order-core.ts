// Pure order logic: Stripe line items, status transitions and checking a
// Checkout Session against our order. No DB, Next or Stripe SDK imports, so it
// runs under `npm test`. Server wiring lives in src/lib/orders.ts.

export const ORDER_STATUSES = ["pending", "processing", "paid", "expired", "failed", "canceled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses each target can be reached from. Anything else is a no-op. */
export const ALLOWED_FROM: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: [],
  processing: ["pending"],
  paid: ["pending", "processing"],
  expired: ["pending"],
  failed: ["pending", "processing"],
  canceled: ["pending"],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return ALLOWED_FROM[to].includes(from);
}

/** Statuses that put reserved stock back. */
export function releasesStock(status: OrderStatus) {
  return status === "expired" || status === "failed" || status === "canceled";
}

/** An order line as snapshotted at checkout. */
export type OrderLine = { productId: string; productName: string; unitPriceCents: number; quantity: number };

export const CURRENCY = "eur";

/** How long a Checkout Session (and our stock hold) lasts; Stripe's minimum. */
export const CHECKOUT_TTL_SECONDS = 30 * 60;

/**
 * Stripe Checkout line items built from our snapshot. Prices are inline
 * `price_data`: our database is the catalog, Stripe never holds products.
 */
export function toStripeLineItems(lines: OrderLine[]) {
  return lines.map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: CURRENCY,
      unit_amount: line.unitPriceCents,
      product_data: { name: line.productName, metadata: { product_id: line.productId } },
    },
  }));
}

export function orderTotalCents(lines: OrderLine[]) {
  return lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
}

/** The Checkout Session fields we rely on (a structural subset of Stripe's type). */
export type SessionSnapshot = {
  id: string;
  client_reference_id: string | null;
  metadata: Record<string, string> | null;
  amount_total: number | null;
  currency: string | null;
  /** Stripe documents "paid" | "unpaid" | "no_payment_required" but may add values. */
  payment_status: string;
  status: string | null;
};

export type OrderSnapshot = { id: string; totalCents: number; stripeCheckoutSessionId: string | null };

/** Why a session can't be trusted for this order, or `null` when it matches. */
export function sessionMismatch(session: SessionSnapshot, order: OrderSnapshot): string | null {
  if (session.metadata?.order_id !== order.id) return "metadata.order_id";
  if (session.client_reference_id !== order.id) return "client_reference_id";
  if (order.stripeCheckoutSessionId !== null && order.stripeCheckoutSessionId !== session.id) return "session id";
  if (session.currency !== CURRENCY) return "currency";
  if (session.amount_total !== order.totalCents) return "amount_total";
  return null;
}

/**
 * Where a completed session moves the order: `paid` once money is confirmed,
 * `processing` while an async method (e.g. SEPA debit) is still settling.
 * `null` when the session isn't complete yet, or for a payment status we don't
 * know (never treat the unknown as paid).
 */
export function statusForSession(session: Pick<SessionSnapshot, "status" | "payment_status">): OrderStatus | null {
  if (session.status !== "complete") return null;
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") return "paid";
  if (session.payment_status === "unpaid") return "processing";
  return null;
}
