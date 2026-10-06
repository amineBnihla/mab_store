/**
 * Orders: reserving stock, tying orders to Stripe Checkout Sessions and moving
 * them through their statuses (see src/lib/order-core.ts).
 *
 * Payment outcomes are written only from verified Stripe webhook events; the
 * browser's return redirect just reads. Every status change is a conditional
 * UPDATE (`WHERE status IN (allowed)`), so redeliveries, out-of-order events
 * and concurrent duplicates all collapse into no-ops. Reserved stock goes back in the same
 * statement as the status change, so it's returned at most once.
 */
import "server-only";

import { and, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import { orderItems, orders, products, stripeEvents, type OrderRow, type ShippingAddress } from "@/db/schema";
import {
  ALLOWED_FROM,
  CHECKOUT_TTL_SECONDS,
  orderTotalCents,
  sessionMismatch,
  statusForSession,
  type OrderLine,
  type OrderStatus,
} from "@/lib/order-core";
import { pgCode, UUID_RE } from "@/lib/pg-error";
import { stripe } from "@/lib/stripe";

export type ReserveResult = { ok: true; orderId: string } | { ok: false; reason: "stock" };

/**
 * Takes the stock and writes a `pending` order with its line snapshot, all in
 * one transaction. The `stock_quantity >= 0` CHECK aborts everything if any
 * product ran short since we read it; the order_items FK aborts it if a
 * product was deleted.
 */
export async function reserveOrder(input: { userId: string; email: string; lines: OrderLine[] }): Promise<ReserveResult> {
  const { userId, email, lines } = input;
  const orderId = crypto.randomUUID();
  const totalCents = orderTotalCents(lines);
  const decrement = sql.join(
    lines.map((line) => sql`when ${line.productId}::uuid then ${line.quantity}::integer`),
    sql` `,
  );

  try {
    await db.batch([
      db
        .update(products)
        .set({ stockQuantity: sql`${products.stockQuantity} - (case ${products.id} ${decrement} end)` })
        .where(inArray(products.id, lines.map((line) => line.productId))),
      db.insert(orders).values({ id: orderId, userId, email, subtotalCents: totalCents, totalCents }),
      db.insert(orderItems).values(lines.map((line) => ({ ...line, orderId }))),
    ]);
  } catch (error) {
    // 23514: check_violation (stock would go negative); 23503: product deleted.
    const code = pgCode(error);
    if (code === "23514" || code === "23503") return { ok: false, reason: "stock" };
    throw error;
  }
  return { ok: true, orderId };
}

export async function attachSession(orderId: string, sessionId: string) {
  await db
    .update(orders)
    .set({ stripeCheckoutSessionId: sessionId })
    .where(and(eq(orders.id, orderId), isNull(orders.stripeCheckoutSessionId)));
}

/**
 * Moves an open order to a terminal failure status and returns its reserved
 * stock in the same statement. A no-op when the order isn't in a status that
 * can reach `status`, so stock is never returned twice.
 */
export async function releaseOrder(orderId: string, status: Extract<OrderStatus, "expired" | "failed" | "canceled">) {
  const from = sql.join(
    ALLOWED_FROM[status].map((s) => sql`${s}`),
    sql`, `,
  );
  await db.execute(sql`
    with released as (
      update orders
      set status = ${status}, stock_released_at = now(), updated_at = now()
      where id = ${orderId} and status in (${from})
      returning id
    )
    update products p
    set stock_quantity = p.stock_quantity + i.quantity, updated_at = now()
    from order_items i
    join released r on r.id = i.order_id
    where p.id = i.product_id
  `);
}

function shippingFrom(session: Stripe.Checkout.Session): { name: string | null; address: ShippingAddress | null } {
  const details = session.collected_information?.shipping_details;
  if (!details) return { name: null, address: null };
  const { line1, line2, city, postal_code, state, country } = details.address;
  return { name: details.name, address: { line1, line2, city, postalCode: postal_code, state, country } };
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  const pi = session.payment_intent;
  return typeof pi === "string" ? pi : (pi?.id ?? null);
}

/** The order a session belongs to, or `undefined` when it isn't one of ours. */
async function orderForSession(session: Stripe.Checkout.Session): Promise<OrderRow | undefined> {
  const orderId = session.metadata?.order_id;
  if (!orderId) return undefined;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return order;
}

/**
 * Brings an order in line with its Checkout Session, re-fetched from Stripe so
 * a stale event payload can't decide the outcome. Only the webhook calls this;
 * safe to run any number of times.
 */
export async function fulfillCheckout(sessionId: string): Promise<OrderRow | undefined> {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const order = await orderForSession(session);
  if (!order) {
    console.warn("checkout: session has no matching order", session.id);
    return undefined;
  }

  const mismatch = sessionMismatch(session, order);
  if (mismatch) {
    // Never mark paid on a session that doesn't match what we charged. Leave
    // the order (and its reserved stock) for a human to review.
    console.error(`checkout: session ${session.id} doesn't match order ${order.id} (${mismatch})`);
    return order;
  }

  const target = statusForSession(session);
  if (!target) return order;

  const shipping = target === "paid" ? shippingFrom(session) : undefined;
  const fields = {
    status: target,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId(session),
    ...(shipping && { paidAt: new Date(), shippingName: shipping.name, shippingAddress: shipping.address }),
  };

  const [updated] = await db
    .update(orders)
    .set(fields)
    .where(and(eq(orders.id, order.id), inArray(orders.status, [...ALLOWED_FROM[target]])))
    .returning();
  return updated ?? (await orderForSession(session));
}

/** Releases the order behind a session that expired or whose payment failed. */
export async function releaseCheckout(session: Stripe.Checkout.Session, status: "expired" | "failed") {
  const order = await orderForSession(session);
  // A null session id means the action crashed before attaching it.
  if (!order || (order.stripeCheckoutSessionId ?? session.id) !== session.id) {
    console.warn("checkout: session has no matching order", session.id);
    return;
  }
  await releaseOrder(order.id, status);
}

/** Orders without a session after this long were orphaned by a crash. */
const ORPHAN_AFTER_MS = 5 * 60 * 1000;

/**
 * Frees stock held by the customer's earlier unfinished checkouts before they
 * start a new one. Expiring the Stripe session first means the customer can't
 * still pay for an order whose stock we've put back; if expiring fails because
 * the session completed meanwhile, the order is left for its webhook.
 */
export async function cancelOpenCheckouts(userId: string) {
  const open = await db
    .select({ id: orders.id, sessionId: orders.stripeCheckoutSessionId, createdAt: orders.createdAt })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, "pending")));

  for (const order of open) {
    if (!order.sessionId) {
      if (Date.now() - order.createdAt.getTime() > ORPHAN_AFTER_MS) await releaseOrder(order.id, "canceled");
      continue;
    }
    try {
      await stripe().checkout.sessions.expire(order.sessionId);
    } catch {
      const session = await stripe().checkout.sessions.retrieve(order.sessionId);
      if (session.status === "complete") continue;
      if (session.status !== "expired") throw new Error(`could not expire session ${session.id}`);
    }
    await releaseOrder(order.id, "canceled");
  }
}

// --- Webhook dedupe ---------------------------------------------------------

export async function isEventProcessed(eventId: string) {
  const [row] = await db.select({ id: stripeEvents.id }).from(stripeEvents).where(eq(stripeEvents.id, eventId)).limit(1);
  return row !== undefined;
}

export async function markEventProcessed(event: Pick<Stripe.Event, "id" | "type">) {
  await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
}

// --- Reads for the account area ---------------------------------------------

export type OrderSummary = Pick<OrderRow, "id" | "status" | "totalCents" | "createdAt"> & { itemCount: number };

/**
 * The user's order history, newest first. Abandoned checkouts (expired,
 * canceled) aren't orders from the customer's point of view, so they're left out.
 */
export async function getOrdersForUser(userId: string, limit?: number): Promise<OrderSummary[]> {
  const query = db
    .select({
      id: orders.id,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.userId, userId), notInArray(orders.status, ["expired", "canceled"])))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt))
    .$dynamic();
  return limit === undefined ? query : query.limit(limit);
}

/**
 * One of the user's orders with its lines; `undefined` for anyone else's.
 * Ownership is part of the query, and only customer-facing fields are
 * returned (no Stripe ids or internal bookkeeping).
 */
export async function getOrderForUser(userId: string, orderId: string) {
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      subtotalCents: orders.subtotalCents,
      totalCents: orders.totalCents,
      shippingName: orders.shippingName,
      shippingAddress: orders.shippingAddress,
      paidAt: orders.paidAt,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  if (!order) return undefined;
  const items = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
      slug: products.slug,
      image: products.imageUrl,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, order.id))
    .orderBy(orderItems.productName);
  return { ...order, items };
}

/** `minutesLeft` is 0 once the hold has lapsed (its expiry webhook may not have landed yet). */
export type OpenCheckout = { minutesLeft: number; held: Map<string, number> };

/**
 * Stock the user's own unfinished checkouts are holding, per product, so their
 * bag can count it as available instead of showing their own hold as sold out.
 */
export async function getOpenCheckout(userId: string): Promise<OpenCheckout | undefined> {
  const rows = await db
    .select({ productId: orderItems.productId, quantity: orderItems.quantity, createdAt: orders.createdAt })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.userId, userId), eq(orders.status, "pending")));
  if (rows.length === 0) return undefined;

  const held = new Map<string, number>();
  for (const row of rows) held.set(row.productId, (held.get(row.productId) ?? 0) + row.quantity);
  const heldUntil = Math.max(...rows.map((row) => row.createdAt.getTime())) + CHECKOUT_TTL_SECONDS * 1000;
  return { minutesLeft: Math.max(0, Math.ceil((heldUntil - Date.now()) / 60_000)), held };
}

/** The user's order for a Checkout Session; `undefined` for anyone else's. */
export async function getOrderForSession(userId: string, sessionId: string) {
  const [order] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(and(eq(orders.stripeCheckoutSessionId, sessionId), eq(orders.userId, userId)))
    .limit(1);
  return order;
}

// --- Reads for the admin area -----------------------------------------------
// Callers must have passed `requireAdmin()`; these are not scoped to a user.

export type AdminOrderSummary = OrderSummary & { email: string };

/** Every order (including abandoned checkouts), newest first, optionally one status. */
export async function getAllOrders({
  status,
  limit = 100,
}: { status?: OrderStatus; limit?: number } = {}): Promise<AdminOrderSummary[]> {
  return db
    .select({
      id: orders.id,
      email: orders.email,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(status ? eq(orders.status, status) : undefined)
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

/** Any order with its line snapshot; `undefined` for an unknown or malformed id. */
export async function getOrderById(orderId: string) {
  if (!UUID_RE.test(orderId)) return undefined;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return undefined;
  const items = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
      slug: products.slug,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, order.id))
    .orderBy(orderItems.productName);
  return { ...order, items };
}
