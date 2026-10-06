import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { ORDER_STATUSES } from "../lib/order-core";

import { user } from "./auth-schema";
import { products } from "./catalog-schema";

/**
 * pending    – Stripe session open, stock reserved
 * processing – session completed, async payment not settled yet; stock still reserved
 * paid       – terminal success
 * expired / failed / canceled – terminal, stock returned
 */
export const orderStatus = pgEnum("order_status", ORDER_STATUSES);

export type ShippingAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  postalCode: string | null;
  state: string | null;
  country: string | null;
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    /** Snapshot of the account email at checkout. */
    email: text("email").notNull(),
    status: orderStatus("status").notNull().default("pending"),
    /** Minor units (euro cents), from our prices at checkout — never from the client. */
    subtotalCents: integer("subtotal_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    /** Null only between reserving stock and creating the Stripe session. */
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    shippingName: text("shipping_name"),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Set when reserved stock goes back to products; at most once. */
    stockReleasedAt: timestamp("stock_released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("orders_subtotal_cents_non_negative", sql`${table.subtotalCents} >= 0`),
    check("orders_total_cents_non_negative", sql`${table.totalCents} >= 0`),
    index("orders_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("orders_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    /** Snapshots: what the customer saw and paid, even if the product changes later. */
    productName: text("product_name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    check("order_items_unit_price_cents_non_negative", sql`${table.unitPriceCents} >= 0`),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    unique("order_items_order_id_product_id_unique").on(table.orderId, table.productId),
  ],
);

/** Stripe webhook events already handled; a cheap early exit for redeliveries. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
