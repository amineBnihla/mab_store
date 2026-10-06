"use server";

import { createCategory, deleteCategory, renameCategory } from "@/lib/admin-products";
import { revalidateCatalog } from "@/lib/admin-revalidate";
import { slugify, validateName, validateSlug } from "@/lib/admin-validation";
import { UUID_RE } from "@/lib/pg-error";
import { requireAdmin } from "@/lib/session";

const UNAVAILABLE = "Something went wrong on our side. Please try again.";

export type CategoryFormState = {
  error?: string;
  fieldErrors?: { name?: string; slug?: string };
  success?: boolean;
  values?: { name?: string; slug?: string };
};

function value(formData: FormData, name: string) {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

export async function createCategoryAction(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdmin();

  const name = value(formData, "name").trim();
  const slug = value(formData, "slug").trim() || slugify(name);
  const values = { name, slug: value(formData, "slug") };

  const fieldErrors: NonNullable<CategoryFormState["fieldErrors"]> = {};
  const nameError = validateName(name);
  if (nameError) fieldErrors.name = nameError;
  const slugError = validateSlug(slug);
  if (slugError) fieldErrors.slug = slugError;
  if (fieldErrors.name || fieldErrors.slug) return { fieldErrors, values };

  try {
    const result = await createCategory({ name, slug });
    if (!result.ok) return { fieldErrors: { slug: "Another category already uses this slug." }, values };
  } catch (e) {
    console.error("admin createCategory failed", e);
    return { error: UNAVAILABLE, values };
  }

  revalidateCatalog();
  return { success: true };
}

export async function renameCategoryAction(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdmin();

  const id = value(formData, "id");
  const name = value(formData, "name").trim();
  const nameError = validateName(name);
  if (nameError) return { fieldErrors: { name: nameError }, values: { name } };
  if (!UUID_RE.test(id)) return { error: "This category no longer exists.", values: { name } };

  try {
    const result = await renameCategory(id, name);
    if (!result.ok) return { error: "This category no longer exists.", values: { name } };
  } catch (e) {
    console.error("admin renameCategory failed", e);
    return { error: UNAVAILABLE, values: { name } };
  }

  revalidateCatalog();
  return { success: true, values: { name } };
}

export async function deleteCategoryAction(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdmin();

  const id = value(formData, "id");
  if (!UUID_RE.test(id)) return { error: "This category no longer exists." };

  try {
    const result = await deleteCategory(id);
    if (!result.ok) return { error: "Move or reassign its products before deleting this category." };
  } catch (e) {
    console.error("admin deleteCategory failed", e);
    return { error: UNAVAILABLE };
  }

  revalidateCatalog();
  return { success: true };
}
