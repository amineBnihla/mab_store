# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev            # Next.js dev server on http://localhost:3000
npm run build          # production build (also type-checks; prerenders product pages, so needs a migrated + seeded DB)
npm run lint           # ESLint (flat config, eslint-config-next)
npm test               # node:test via tsx, runs src/**/*.test.ts (pure modules only — no DB)

npm run db:generate    # drizzle-kit: generate SQL migrations from src/db/schema.ts into ./drizzle
npm run db:migrate     # apply generated migrations
npm run db:push        # push schema directly (no migration files) — throwaway DBs only
npm run db:studio      # Drizzle Studio
npm run db:seed        # idempotent catalog seed (src/db/seed.ts, upserts on slug)

npm run auth:generate  # Better Auth CLI: regenerates auth tables into src/db/auth-schema.ts
npm run auth:set-role -- <email> <customer|admin>  # promote/demote a user (only way to set role)
```

## Stack

Next.js 16 (App Router, `src/` dir, `@/*` → `src/*`), React 19, Tailwind CSS v4 (via `@tailwindcss/postcss`), Drizzle ORM on Neon serverless Postgres, Better Auth. Next 16 differs from older versions — consult `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md).

## Architecture

- **Env** — `src/env.ts` is the single place server code reads env vars. It throws at import time if `DATABASE_URL` or `BETTER_AUTH_SECRET` is missing, so anything importing `@/db` or `@/lib/auth` requires those to be set. Copy `.env.example` to `.env.local`. The browser-side auth client reads `NEXT_PUBLIC_APP_URL` directly from `process.env`.
- **Database** — `src/db/index.ts` exports `db` (Drizzle over `@neondatabase/serverless` HTTP driver, i.e. `drizzle-orm/neon-http`) and `schema`. `src/db/schema.ts` is the one schema entrypoint: every table must be defined in or re-exported from it, because both `drizzle-kit` (`drizzle.config.ts`) and the Better Auth Drizzle adapter consume that single module. App tables live in `src/db/catalog-schema.ts`, Better Auth tables (`user`, `session`, `account`, `verification`) in the generated `src/db/auth-schema.ts`; `schema.ts` only re-exports both.
- **drizzle-kit env loading** — `drizzle.config.ts` loads `.env.local` then `.env` via dotenv to mirror Next's precedence, so CLI commands hit the same DB as the app. `src/db/seed.ts` does the same and builds its own client instead of importing `@/db`.
- **Auth** — `src/lib/auth.ts` is the server Better Auth instance (Drizzle adapter, `pg` provider). `nextCookies()` must stay last in `plugins`. It's mounted at `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`. `src/lib/auth-client.ts` exports the React `authClient` for client components.
- **Auth schema workflow** — after adding Better Auth plugins/fields, run `npm run auth:generate` (overwrites `src/db/auth-schema.ts` — don't hand-edit it), then `db:generate` + `db:migrate`.
- **Auth scope (v1)** — email/password only; 30-day DB sessions, no `cookieCache` (so sign-out and role changes apply on the next request). `user.role` (`customer` | `admin`) is a Better Auth `additionalField` with `input: false`, so clients can't set it; we deliberately don't use the `admin` plugin (no ban/impersonation endpoints).
- **Auth checks** — `src/lib/session.ts` is the data access layer: `getSession()`, `requireUser()`, `requireAdmin()` (non-admins get a 404), `safeNext()` for `?next=` redirects. Every protected page **and** server action must call these itself. `src/proxy.ts` (Next 16's renamed middleware) only redirects when there's no session cookie on `/account` and `/admin`; it never hits the DB and isn't a security boundary. Never read the session in the root layout or catalog pages — that makes the ISR routes dynamic.
- **Auth forms** — sign-in/sign-up/sign-out are server actions in `src/app/(auth)/actions.ts` calling `auth.api.*`; `nextCookies()` sets the cookie on the action response.

## Database conventions

- **Schema changes go through migrations**: `db:generate`, review the SQL, `db:migrate`, commit `drizzle/`. Don't `db:push` against a shared DB.
- **Money is integer minor units** (`*_cents`), never float or `numeric`. Single currency (EUR), so no currency column until multi-currency is real.
- **Stock is one integer on `products`** with a `CHECK (>= 0)`. In/low/out-of-stock is derived at read time, never stored. Future decrements must be atomic (`SET stock_quantity = stock_quantity - n WHERE ... AND stock_quantity >= n`). Displayed stock can be ~60s stale (page `revalidate`), so checkout must read it live.
- **Product reads go through `src/lib/products.ts`**; components never query `db` directly.
- **Keep v1 scope**: products, categories, stock, a shopping bag and Stripe checkout/orders only. No wishlists, reviews, refunds UI, warehouses or variants unless asked. When variants/warehouses arrive, stock moves to its own table.
- **Bag (cart)** — an httpOnly `bag` cookie holding only `[{id, q}]`; no DB tables. Pure logic (parse, clamp, price) is in `src/lib/cart-core.ts` (unit-tested), cookie I/O and `getBag()` in `src/lib/cart.ts`, mutations in `src/app/bag/actions.ts`. The cookie is untrusted intent: price and stock always come live from `getProductsForBag()` (uncached), quantities are clamped to stock on every action and at render. The bag doesn't reserve or decrement stock — that's checkout's job. Reading it makes a route dynamic, so keep it out of the root layout and catalog pages.
- **Seed stays idempotent**: upsert on `slug`, safe to re-run.

## Checkout & orders (Stripe)

- **Ownership** — our DB owns catalog, prices, stock and orders; Stripe owns payment collection and outcome. Lines go to Stripe as inline `price_data` built from our order snapshot (`toStripeLineItems`); we never create Stripe Products/Prices. Never accept price, total or payment status from the client.
- **Files** — schema `src/db/order-schema.ts` (`orders`, `order_items` snapshots, `stripe_events`); pure logic `src/lib/order-core.ts` (status transitions, session-vs-order checks; unit-tested); DB + Stripe wiring `src/lib/orders.ts`; Stripe client `src/lib/stripe.ts` (lazy, so builds need no Stripe keys); `startCheckout` in `src/app/checkout/actions.ts`; return URL `src/app/checkout/return/route.ts`; webhook `src/app/api/stripe/webhook/route.ts`.
- **Flow** — `startCheckout` requires sign-in, re-reads the bag live, refuses if anything is sold out/reduced, expires the user's earlier open sessions, then **reserves stock and writes a `pending` order in one `db.batch`** (neon-http has no `db.transaction`; the `stock_quantity >= 0` CHECK aborts an oversell atomically), then creates a 30-min Checkout Session (idempotency key = order id). Stripe's `cancel_url` is `/checkout/cancel`, which expires the open session and returns its stock, then shows `/bag?checkout=canceled` (the return page sends expired/failed orders to `/bag?checkout=<status>` too). Until then the bag credits the shopper's own held stock back (`getOpenCheckout`), so their hold never shows as sold out.
- **State machine** — `pending → processing → paid`, or `pending|processing → expired|failed|canceled`. Every transition is a conditional `UPDATE … WHERE status IN (ALLOWED_FROM[to])`; `releaseOrder` flips status and restocks in one statement, so stock comes back at most once. Paying never touches stock (it was reserved).
- **Confirmation** — only `fulfillCheckout(sessionId)` marks orders paid: it re-fetches the session from Stripe, checks `metadata.order_id`, `client_reference_id`, session id, `currency === 'eur'` and `amount_total`, and gates on `payment_status`. Only the webhook calls it. The return page (`/checkout/return`) is read-only: it never confirms payment, it clears the bag and shows the order, which auto-refreshes while still `pending` until the webhook lands.
- **Webhook** — verifies the signature on the raw body; handles `checkout.session.completed`, `async_payment_succeeded`, `async_payment_failed`, `expired`. `stripe_events` is written after a successful handle (dedupe/audit); the state machine is the real idempotency guard.
- **Env** — `STRIPE_SECRET_KEY` (restricted `rk_` key) and `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Admin

- **Routes** — `src/app/admin/`: `products` (list, `new`, `[id]/edit`), `categories`, `stock`, `orders` (list with `?status=`, `[id]` detail, read-only). `/admin` redirects to `/admin/products`. `admin/layout.tsx` is chrome only (no session read).
- **Auth** — every admin page **and** every exported function in `admin/**/actions.ts` must start with `await requireAdmin()` (non-admins get a 404). `src/app/admin/admin-auth.test.ts` scans the files and fails `npm test` if one is missing. New admin routes/actions are covered automatically.
- **Data** — admin reads/writes live in `src/lib/admin-products.ts` (no auth inside; callers gate) and `getAllOrders`/`getOrderById` in `src/lib/orders.ts`. Pure validation is `src/lib/admin-validation.ts` (tested); Postgres error codes and `UUID_RE` in `src/lib/pg-error.ts`.
- **Stock** — the product edit form does not touch stock (checkout holds stock in the same column). Stock page offers `setStock` (overwrite) and `adjustStock` (atomic `+n`, refuses below zero); prefer the relative one for restocking.
- **Cache** — storefront is time-based ISR with no tags, so catalog writes call `revalidateCatalog()` (`src/lib/admin-revalidate.ts`, `revalidatePath` by route pattern).
- **Scope** — no product delete (`order_items.product_id` is `restrict`; would need an archive column), no image upload (URL must be on an `IMAGE_HOSTS` host, kept in sync with `next.config.ts`), category slug is immutable after creation, order status is read-only.
