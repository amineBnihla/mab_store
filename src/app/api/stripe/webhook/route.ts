import type Stripe from "stripe";

import { stripeEnv } from "@/env";
import { fulfillCheckout, isEventProcessed, markEventProcessed, releaseCheckout } from "@/lib/orders";
import { stripe } from "@/lib/stripe";

/**
 * Stripe webhook. The signature is verified against the raw body before
 * anything else; events are then applied through the order state machine, so
 * redeliveries and out-of-order events are no-ops. A thrown error returns 500
 * and Stripe retries (for up to three days).
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // Read outside the try: a missing secret is our misconfiguration (500), not a bad request.
  const secret = stripeEnv.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (await isEventProcessed(event.id)) return Response.json({ received: true, duplicate: true });

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // Gated on payment_status inside: completed-but-unpaid (async methods)
      // only moves the order to `processing`.
      await fulfillCheckout(event.data.object.id);
      break;
    case "checkout.session.async_payment_failed":
      await releaseCheckout(event.data.object, "failed");
      break;
    case "checkout.session.expired":
      await releaseCheckout(event.data.object, "expired");
      break;
    default:
      return Response.json({ received: true, ignored: true });
  }

  // Recorded only after the handler succeeded, so a crash mid-way is retried.
  await markEventProcessed(event);
  return Response.json({ received: true });
}
