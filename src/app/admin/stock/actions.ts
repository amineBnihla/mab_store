"use server";

import { adjustStock, setStock } from "@/lib/admin-products";
import { revalidateCatalog } from "@/lib/admin-revalidate";
import { parseStock, parseStockDelta } from "@/lib/admin-validation";
import { UUID_RE } from "@/lib/pg-error";
import { requireAdmin } from "@/lib/session";

const UNAVAILABLE = "Something went wrong on our side. Please try again.";
const GONE = "This product no longer exists.";

export type StockFormState = { error?: string; success?: boolean };

function value(formData: FormData, name: string) {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

export async function setStockAction(_prev: StockFormState, formData: FormData): Promise<StockFormState> {
  await requireAdmin();

  const id = value(formData, "id");
  if (!UUID_RE.test(id)) return { error: GONE };
  const parsed = parseStock(value(formData, "quantity"));
  if ("error" in parsed) return { error: parsed.error };

  try {
    const result = await setStock(id, parsed.quantity);
    if (!result.ok) return { error: GONE };
  } catch (e) {
    console.error("admin setStock failed", e);
    return { error: UNAVAILABLE };
  }

  revalidateCatalog();
  return { success: true };
}

export async function adjustStockAction(_prev: StockFormState, formData: FormData): Promise<StockFormState> {
  await requireAdmin();

  const id = value(formData, "id");
  if (!UUID_RE.test(id)) return { error: GONE };
  const parsed = parseStockDelta(value(formData, "delta"));
  if ("error" in parsed) return { error: parsed.error };

  try {
    const result = await adjustStock(id, parsed.delta);
    if (!result.ok) return { error: result.reason === "below-zero" ? "Stock can't go below zero." : GONE };
  } catch (e) {
    console.error("admin adjustStock failed", e);
    return { error: UNAVAILABLE };
  }

  revalidateCatalog();
  return { success: true };
}
