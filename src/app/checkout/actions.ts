"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { env } from "@/env";
import { readBag, writeBag } from "@/lib/cart";
import { reconcileBag } from "@/lib/cart-core";
import { CHECKOUT_TTL_SECONDS, toStripeLineItems, type OrderLine } from "@/lib/order-core";
import { attachSession, cancelOpenCheckouts, releaseOrder, reserveOrder } from "@/lib/orders";
import { getProductsForBag } from "@/lib/products";
import { requireUser } from "@/lib/session";
import { stripe } from "@/lib/stripe";

export type CheckoutState = { error?: string };

const UNAVAILABLE = "Something went wrong on our side. Please try again.";
const CHANGED = "Some pieces in your bag changed while you were shopping. Please review your bag and try again.";

/** We ship within the EU. */
const SHIPPING_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
] as const;

/**
 * Starts Stripe Checkout for the current bag. Takes no input: what's bought
 * comes from the bag cookie, what it costs from the database. Stock is reserved
 * here and returned if the session expires or payment fails.
 */
export async function startCheckout(): Promise<CheckoutState> {
  const { user } = await requireUser("/bag");

  let url: string;
  try {
    // Release earlier unfinished checkouts first so their held stock counts as
    // available again (it's this customer's own hold).
    await cancelOpenCheckouts(user.id);
    const entries = await readBag();
    const { lines } = reconcileBag(entries, await getProductsForBag(entries.map((entry) => entry.id)));
    if (lines.length === 0) {
      refresh();
      return { error: "Your bag is empty." };
    }
    if (lines.some((line) => line.status === "sold-out")) {
      refresh();
      return { error: "Remove sold-out pieces from your bag to continue." };
    }
    if (lines.some((line) => line.status === "reduced")) {
      // Save the clamped quantities so the bag shows what's actually available.
      await writeBag(lines.map((line) => ({ id: line.product.id, q: line.quantity })));
      refresh();
      return { error: CHANGED };
    }

    const orderLines: OrderLine[] = lines.map((line) => ({
      productId: line.product.id,
      productName: line.product.name,
      unitPriceCents: line.product.priceCents,
      quantity: line.quantity,
    }));

    const reserved = await reserveOrder({ userId: user.id, email: user.email, lines: orderLines });
    if (!reserved.ok) {
      refresh();
      return { error: CHANGED };
    }
    const { orderId } = reserved;

    let session;
    try {
      session = await stripe().checkout.sessions.create(
        {
          mode: "payment",
          line_items: toStripeLineItems(orderLines),
          customer_email: user.email,
          client_reference_id: orderId,
          metadata: { order_id: orderId },
          payment_intent_data: { metadata: { order_id: orderId } },
          shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
          expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
          success_url: `${env.BETTER_AUTH_URL}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${env.BETTER_AUTH_URL}/checkout/cancel`,
          integration_identifier: "maison-bag-checkout-qkzvmtra",
        },
        { idempotencyKey: `checkout:${orderId}` },
      );
    } catch (error) {
      // No session, so nobody can pay for this order: return its stock now.
      await releaseOrder(orderId, "canceled");
      throw error;
    }
    // From here the session exists and its expiry webhook will release the
    // stock, so a failure must not release it early.
    await attachSession(orderId, session.id);
    if (!session.url) throw new Error(`checkout session ${session.id} has no url`);
    url = session.url;
  } catch (error) {
    console.error("start-checkout failed", error);
    return { error: UNAVAILABLE };
  }

  redirect(url);
}
