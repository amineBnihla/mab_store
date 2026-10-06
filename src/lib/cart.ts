/**
 * The shopping bag lives in an httpOnly cookie holding product ids and
 * quantities only. Price, stock and everything shown are read live from the
 * database on every request, so a tampered cookie can't change what anything
 * costs — at worst it asks for products or quantities that get dropped or
 * clamped.
 *
 * Reading the bag makes a route dynamic; never call it from the root layout or
 * catalog pages.
 */
import "server-only";

import { cookies } from "next/headers";

import { parseBag, reconcileBag, serializeBag, type BagEntry } from "@/lib/cart-core";
import { getOpenCheckout } from "@/lib/orders";
import { getProductsForBag } from "@/lib/products";
import { getSession } from "@/lib/session";

const COOKIE = "bag";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function readBag(): Promise<BagEntry[]> {
  return parseBag((await cookies()).get(COOKIE)?.value);
}

/** Only callable from server actions and route handlers. */
export async function writeBag(entries: BagEntry[]) {
  const store = await cookies();
  if (entries.length === 0) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, serializeBag(entries), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/**
 * Live products for the bag. Stock the shopper's own unfinished checkout is
 * holding counts as available to them: starting checkout again releases it.
 */
export async function getBagProducts(ids: string[]) {
  if (ids.length === 0) return { products: [], openCheckout: undefined };
  const session = await getSession();
  const [products, openCheckout] = await Promise.all([
    getProductsForBag(ids),
    session ? getOpenCheckout(session.user.id) : undefined,
  ]);
  const held = openCheckout?.held;
  return {
    products: held ? products.map((p) => ({ ...p, stock: p.stock + (held.get(p.id) ?? 0) })) : products,
    openCheckout,
  };
}

/** The bag with live prices and stock applied, plus the shopper's open checkout if any. */
export async function getBag() {
  const entries = await readBag();
  const { products, openCheckout } = await getBagProducts(entries.map((entry) => entry.id));
  return { ...reconcileBag(entries, products), openCheckout };
}
