"use server";

import { refresh } from "next/cache";

import { getBagProducts, readBag, writeBag } from "@/lib/cart";
import { clampQuantity, isProductId, isQuantity, MAX_LINES, MAX_QTY_PER_LINE, setEntry } from "@/lib/cart-core";

export type BagActionState = {
  /** Nothing changed (bad input, sold out, product gone). */
  error?: string;
  /** Something changed, but not exactly as asked (quantity limited by stock). */
  notice?: string;
  success?: boolean;
};

const UNAVAILABLE = "Something went wrong on our side. Please try again.";
const GONE = "This piece is no longer available.";

function value(formData: FormData, name: string) {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

function units(n: number) {
  return `${n} ${n === 1 ? "piece" : "pieces"}`;
}

/** Live stock for one product (incl. the shopper's own hold); `undefined` when it no longer exists. */
async function liveStock(productId: string) {
  const {
    products: [product],
  } = await getBagProducts([productId]);
  return product?.stock;
}

export async function addToBag(_prev: BagActionState, formData: FormData): Promise<BagActionState> {
  const productId = value(formData, "productId");
  if (!isProductId(productId)) return { error: GONE };

  try {
    const [entries, stock] = await Promise.all([readBag(), liveStock(productId)]);
    if (stock === undefined) return { error: GONE };
    if (stock === 0) return { error: "Sorry, this piece is out of stock." };

    const inBag = entries.find((entry) => entry.id === productId.toLowerCase())?.q ?? 0;
    if (inBag === 0 && entries.length >= MAX_LINES) {
      return { error: `Your bag can hold up to ${MAX_LINES} different pieces.` };
    }

    const { quantity, clamped } = clampQuantity(inBag + 1, stock);
    if (quantity !== inBag) await writeBag(setEntry(entries, productId, quantity));

    if (clamped) {
      const limit =
        stock > MAX_QTY_PER_LINE
          ? `You can add up to ${MAX_QTY_PER_LINE} of one piece`
          : `Only ${units(stock)} available`;
      return quantity === inBag
        ? { error: `${limit} — your bag already has ${quantity}.` }
        : { notice: `${limit}. Your bag now has ${quantity}.`, success: true };
    }
    return { success: true };
  } catch (error) {
    console.error("add-to-bag failed", error);
    return { error: UNAVAILABLE };
  }
}

export async function updateBagQuantity(_prev: BagActionState, formData: FormData): Promise<BagActionState> {
  const productId = value(formData, "productId");
  const requested = Number(value(formData, "quantity"));
  if (!isProductId(productId)) return { error: GONE };
  if (!isQuantity(requested)) return { error: `Choose a quantity from 1 to ${MAX_QTY_PER_LINE}.` };

  try {
    const [entries, stock] = await Promise.all([readBag(), liveStock(productId)]);
    if (!entries.some((entry) => entry.id === productId.toLowerCase())) {
      refresh();
      return { error: "This piece is no longer in your bag." };
    }
    if (stock === undefined) {
      await writeBag(setEntry(entries, productId, 0));
      refresh();
      return { error: GONE };
    }
    if (stock === 0) {
      refresh();
      return { error: "Sorry, this piece has sold out. Remove it to continue." };
    }

    const { quantity, clamped } = clampQuantity(requested, stock);
    await writeBag(setEntry(entries, productId, quantity));
    refresh();
    // `isQuantity` already capped `requested`, so clamping here means stock ran short.
    return clamped
      ? { notice: `Only ${units(quantity)} left — quantity updated to ${quantity}.`, success: true }
      : { success: true };
  } catch (error) {
    console.error("update-bag failed", error);
    return { error: UNAVAILABLE };
  }
}

export async function removeFromBag(_prev: BagActionState, formData: FormData): Promise<BagActionState> {
  const productId = value(formData, "productId");
  if (!isProductId(productId)) return { error: GONE };

  try {
    await writeBag(setEntry(await readBag(), productId, 0));
  } catch (error) {
    console.error("remove-from-bag failed", error);
    return { error: UNAVAILABLE };
  }
  refresh();
  return { success: true };
}
