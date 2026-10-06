/**
 * Data access layer for auth. The authoritative session and role checks live
 * here; `src/proxy.ts` only does an optimistic cookie-presence redirect.
 *
 * Every protected page, server action and data function must call
 * `requireUser()` / `requireAdmin()` itself — layout checks alone don't re-run
 * on client navigation.
 *
 * Only import this from request-time code: reading headers makes a route
 * dynamic, so never call it from the root layout or catalog pages.
 */
import "server-only";

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

export const getSession = cache(async () => {
  // Take the cookie from `cookies()`, not the raw request headers: when a server
  // action rotates the session (e.g. change-password), the re-render in the same
  // response must see the new token, not the one that was just revoked.
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("cookie", (await cookies()).toString());
  return auth.api.getSession({ headers: requestHeaders });
});

export async function requireUser(next = "/account") {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=%2Fadmin");
  // 404 rather than 403 so the admin area isn't advertised to customers.
  if (session.user.role !== "admin") notFound();
  return session;
}

/** Only same-origin relative paths; anything else falls back to `/account`. */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/account";
  }
  return value;
}
