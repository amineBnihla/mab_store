"use client";

import { useActionState, useId } from "react";

import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
  type CategoryFormState,
} from "@/app/admin/categories/actions";
import { FieldError, FormAlert, Spinner } from "@/components/form-feedback";

export function CreateCategoryForm() {
  const [state, formAction, pending] = useActionState<CategoryFormState, FormData>(createCategoryAction, {});
  const id = useId();

  return (
    <form action={formAction} noValidate aria-busy={pending} className="space-y-6">
      <FormAlert message={state.error} />
      <fieldset disabled={pending} className="grid gap-6 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <div>
          <label htmlFor={`${id}-name`} className="field-label">
            Name
          </label>
          <input
            id={`${id}-name`}
            name="name"
            required
            defaultValue={state.values?.name ?? ""}
            aria-invalid={state.fieldErrors?.name ? true : undefined}
            aria-describedby={state.fieldErrors?.name ? `${id}-name-error` : undefined}
            className="field"
          />
          <FieldError id={`${id}-name-error`} message={state.fieldErrors?.name} />
        </div>
        <div>
          <label htmlFor={`${id}-slug`} className="field-label">
            Slug (optional)
          </label>
          <input
            id={`${id}-slug`}
            name="slug"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.values?.slug ?? ""}
            aria-invalid={state.fieldErrors?.slug ? true : undefined}
            aria-describedby={state.fieldErrors?.slug ? `${id}-slug-error` : undefined}
            className="field"
          />
          <FieldError id={`${id}-slug-error`} message={state.fieldErrors?.slug} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm sm:mt-5">
          {pending && <Spinner />}
          Add category
        </button>
      </fieldset>
      <p role="status" className="text-xs text-success">
        {state.success && "Category added."}
      </p>
    </form>
  );
}

/** One category row: inline rename plus delete (blocked server-side while it has products). */
export function CategoryRow({
  id,
  name,
  slug,
  productCount,
}: {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}) {
  const [rename, renameAction, renaming] = useActionState<CategoryFormState, FormData>(renameCategoryAction, {});
  const [remove, removeAction, removing] = useActionState<CategoryFormState, FormData>(deleteCategoryAction, {});
  const fieldId = useId();
  const message = rename.error ?? remove.error;

  return (
    <li className="border-b py-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end sm:gap-6">
        <form action={renameAction} noValidate aria-busy={renaming} className="flex items-end gap-4">
          <input type="hidden" name="id" value={id} />
          <div className="min-w-0 flex-1">
            <label htmlFor={fieldId} className="field-label">
              /{slug} · {productCount} {productCount === 1 ? "product" : "products"}
            </label>
            <input
              id={fieldId}
              name="name"
              required
              defaultValue={rename.values?.name ?? name}
              aria-invalid={rename.fieldErrors?.name ? true : undefined}
              aria-describedby={rename.fieldErrors?.name ? `${fieldId}-error` : undefined}
              className="field"
            />
          </div>
          <button type="submit" disabled={renaming} className="btn btn-outline btn-sm">
            {renaming && <Spinner />}
            Rename
          </button>
        </form>
        <form
          action={removeAction}
          aria-busy={removing}
          onSubmit={(e) => {
            if (!confirm(`Delete the category “${name}”?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={removing || productCount > 0} className="btn btn-outline btn-sm">
            Delete
          </button>
        </form>
      </div>
      <FieldError id={`${fieldId}-error`} message={rename.fieldErrors?.name} />
      <p role="status" className="mt-2 text-2xs text-danger empty:hidden">
        {message}
      </p>
    </li>
  );
}
