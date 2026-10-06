/**
 * Central place to read server-side environment variables.
 * Fails loudly at import time so a missing variable surfaces as a clear
 * error instead of an obscure connection failure deeper in the stack.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
};

/**
 * Stripe keys, read lazily so `next build` (which prerenders catalog pages)
 * doesn't need them. Use a restricted key (`rk_…`) with write access to
 * Checkout Sessions.
 */
export const stripeEnv = {
  get STRIPE_SECRET_KEY() {
    return required("STRIPE_SECRET_KEY");
  },
  get STRIPE_WEBHOOK_SECRET() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
};
