import "server-only";

import Stripe from "stripe";

import { stripeEnv } from "@/env";

let client: Stripe | undefined;

/**
 * The Stripe client, created on first use so builds and catalog pages don't
 * need Stripe keys. The API version is the one this SDK release is pinned to.
 */
export function stripe() {
  client ??= new Stripe(stripeEnv.STRIPE_SECRET_KEY, { appInfo: { name: "ecom-app" } });
  return client;
}
