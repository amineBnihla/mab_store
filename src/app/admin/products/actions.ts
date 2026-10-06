"use server";

import { redirect } from "next/navigation";

import { createProduct, getAdminProduct, updateProduct } from "@/lib/admin-products";
import { revalidateCatalog } from "@/lib/admin-revalidate";
import {
  PRODUCT_FIELDS,
  validateProductForm,
  type ProductField,
  type ProductFieldErrors,
} from "@/lib/admin-validation";
import { requireAdmin } from "@/lib/session";

const UNAVAILABLE = "Something went wrong on our side. Please try again.";

export type ProductFormState = {
  error?: string;
  fieldErrors?: ProductFieldErrors;
  /** Echoed so a failed submit doesn't lose what was typed. */
  values?: Partial<Record<ProductField, string>>;
};

function value(formData: FormData, name: string) {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

function readValues(formData: FormData) {
  const values: Partial<Record<ProductField, string>> = {};
  for (const field of PRODUCT_FIELDS) values[field] = value(formData, field);
  return values;
}

export async function createProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();

  const values = readValues(formData);
  const parsed = validateProductForm(values, "create");
  if ("errors" in parsed) return { fieldErrors: parsed.errors, values };

  let result;
  try {
    result = await createProduct(parsed.product);
  } catch (e) {
    console.error("admin createProduct failed", e);
    return { error: UNAVAILABLE, values };
  }
  if (!result.ok) {
    return result.reason === "slug"
      ? { fieldErrors: { slug: "Another product already uses this slug." }, values }
      : { fieldErrors: { categoryId: "That category no longer exists." }, values };
  }

  revalidateCatalog();
  redirect("/admin/products");
}

export async function updateProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();

  const id = value(formData, "id");
  const values = readValues(formData);
  const parsed = validateProductForm(values, "edit");
  if ("errors" in parsed) return { fieldErrors: parsed.errors, values };

  // Stock is deliberately not part of this form: checkout holds stock in the
  // same column, so overwriting it here could clobber a reservation.
  const { stock, ...input } = parsed.product;
  void stock;

  let result;
  try {
    if (!(await getAdminProduct(id))) return { error: "This product no longer exists.", values };
    result = await updateProduct(id, input);
  } catch (e) {
    console.error("admin updateProduct failed", e);
    return { error: UNAVAILABLE, values };
  }
  if (!result.ok) {
    if (result.reason === "slug") return { fieldErrors: { slug: "Another product already uses this slug." }, values };
    if (result.reason === "category") return { fieldErrors: { categoryId: "That category no longer exists." }, values };
    return { error: "This product no longer exists.", values };
  }

  revalidateCatalog();
  redirect("/admin/products");
}
