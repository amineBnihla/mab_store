/**
 * Drizzle schema entrypoint.
 *
 * Re-export every table from this file so `drizzle-kit` and the Better Auth
 * adapter see one schema object. App tables live in catalog-schema.ts; Better
 * Auth tables are generated into auth-schema.ts by `npm run auth:generate`.
 */
export * from "./catalog-schema";
export * from "./auth-schema";
