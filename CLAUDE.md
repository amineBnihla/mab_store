# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev            # Next.js dev server on http://localhost:3000
npm run build          # production build (also type-checks; prerenders product pages, so needs a migrated + seeded DB)
npm run lint           # ESLint (flat config, eslint-config-next)

npm run db:generate    # drizzle-kit: generate SQL migrations from src/db/schema.ts into ./drizzle
npm run db:migrate     # apply generated migrations
npm run db:push        # push schema directly (no migration files) — dev only
npm run db:studio      # Drizzle Studio
npm run db:seed        # idempotent catalog seed (src/db/seed.ts, upserts on slug)

npm run auth:generate  # Better Auth CLI: regenerates auth tables into src/db/auth-schema.ts
```

There is no test runner configured yet.

## Stack

Next.js 16 (App Router, `src/` dir, `@/*` → `src/*`), React 19, Tailwind CSS v4 (via `@tailwindcss/postcss`), Drizzle ORM on Neon serverless Postgres, Better Auth. Next 16 differs from older versions — consult `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md).

## Architecture

- **Env** — `src/env.ts` is the single place server code reads env vars. It throws at import time if `DATABASE_URL` or `BETTER_AUTH_SECRET` is missing, so anything importing `@/db` or `@/lib/auth` requires those to be set. Copy `.env.example` to `.env.local`. The browser-side auth client reads `NEXT_PUBLIC_APP_URL` directly from `process.env`.
- **Database** — `src/db/index.ts` exports `db` (Drizzle over `@neondatabase/serverless` HTTP driver, i.e. `drizzle-orm/neon-http`) and `schema`. `src/db/schema.ts` is the one schema entrypoint: every table must be defined in or re-exported from it, because both `drizzle-kit` (`drizzle.config.ts`) and the Better Auth Drizzle adapter consume that single module. App tables live in `src/db/catalog-schema.ts`, Better Auth tables (`user`, `session`, `account`, `verification`) in the generated `src/db/auth-schema.ts`; `schema.ts` only re-exports both.
- **Catalog** — `categories` and `products` tables. Prices are integer euro cents (`price_cents`; `formatPrice` in `src/lib/catalog.ts` takes cents). Stock is `products.stock_quantity` (CHECK ≥ 0); in/low/out state is derived by `getStockState`. All product reads go through `src/lib/products.ts` (server-only), which maps rows to the UI `Product` type. `/` and `/products/[slug]` use `export const revalidate = 60` (Cache Components is not enabled). `src/lib/catalog.ts` holds only editorial content and helpers.
- **drizzle-kit env loading** — `drizzle.config.ts` loads `.env.local` then `.env` via dotenv to mirror Next's precedence, so CLI commands hit the same DB as the app. `src/db/seed.ts` does the same and builds its own client instead of importing `@/db`.
- **Auth** — `src/lib/auth.ts` is the server Better Auth instance (Drizzle adapter, `pg` provider). `nextCookies()` must stay last in `plugins`. It's mounted at `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`. `src/lib/auth-client.ts` exports the React `authClient` for client components.
- **Auth schema workflow** — after adding Better Auth plugins/fields, run `npm run auth:generate` (overwrites `src/db/auth-schema.ts` — don't hand-edit it), then `db:generate` + `db:migrate` (or `db:push`).
