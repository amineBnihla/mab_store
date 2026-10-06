"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  createProductAction,
  updateProductAction,
  type ProductFormState,
} from "@/app/admin/products/actions";
import { FieldError, focusField, FormAlert, SubmitRow } from "@/components/form-feedback";
import { IMAGE_HOSTS, PRODUCT_FIELDS, type ProductField } from "@/lib/admin-validation";

export type ProductFormValues = Partial<Record<ProductField, string>>;

type Props = {
  mode: "create" | "edit";
  categories: { id: string; name: string }[];
  /** Edit only. */
  productId?: string;
  initial?: ProductFormValues;
};

function Row({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      <FieldError id={`${id}-error`} message={error} />
      {hint && !error && <p className="mt-2 text-2xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ProductForm({ mode, categories, productId, initial = {} }: Props) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    mode === "create" ? createProductAction : updateProductAction,
    {},
  );
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const prefix = useId();

  // A fresh result means any field message is current again.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setDirty(new Set());
  }

  useEffect(() => {
    const first = PRODUCT_FIELDS.find((f) => state.fieldErrors?.[f]);
    if (first) focusField(formRef.current, first);
  }, [state]);

  const values = state.values ?? initial;

  /** Shared wiring for one control: ids, value, error association, dirty tracking. */
  function control(field: ProductField) {
    const error = dirty.has(field) ? undefined : state.fieldErrors?.[field];
    const id = `${prefix}-${field}`;
    return {
      error,
      id,
      attrs: {
        id,
        name: field,
        defaultValue: values[field] ?? "",
        "aria-invalid": error ? (true as const) : undefined,
        "aria-describedby": error ? `${id}-error` : undefined,
        onChange: () => setDirty((prev) => new Set(prev).add(field)),
      },
    };
  }

  const name = control("name");
  const slug = control("slug");
  const category = control("categoryId");
  const price = control("price");
  const stock = control("stock");
  const image = control("imageUrl");
  const badge = control("badge");
  const description = control("description");
  const details = control("details");
  const area = "field h-auto py-2 leading-relaxed";

  return (
    <form ref={formRef} action={formAction} noValidate aria-busy={pending} className="max-w-2xl space-y-6">
      <FormAlert message={state.error} />
      {mode === "edit" && <input type="hidden" name="id" value={productId} />}

      <fieldset disabled={pending} className="space-y-6">
        <Row id={name.id} label="Name" error={name.error}>
          <input {...name.attrs} required className="field" />
        </Row>

        <Row
          id={slug.id}
          label="Slug"
          error={slug.error}
          hint={
            mode === "create"
              ? "Part of the product URL. Leave blank to generate it from the name."
              : "Part of the product URL. Changing it breaks existing links."
          }
        >
          <input {...slug.attrs} autoCapitalize="none" spellCheck={false} className="field" />
        </Row>

        <Row id={category.id} label="Category" error={category.error}>
          <select {...category.attrs} className="field">
            <option value="">Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>

        <div className="grid gap-6 sm:grid-cols-2">
          <Row id={price.id} label="Price (EUR)" error={price.error} hint="For example 49 or 49.90.">
            <input {...price.attrs} inputMode="decimal" required className="field" />
          </Row>
          {mode === "create" && (
            <Row id={stock.id} label="Opening stock" error={stock.error}>
              <input {...stock.attrs} inputMode="numeric" required className="field" />
            </Row>
          )}
        </div>

        <Row id={image.id} label="Image URL" error={image.error} hint={`Must be hosted on ${IMAGE_HOSTS.join(", ")}.`}>
          <input {...image.attrs} type="url" required className="field" />
        </Row>

        <Row id={badge.id} label="Badge" error={badge.error} hint="Optional short label, like “New”.">
          <input {...badge.attrs} className="field" />
        </Row>

        <Row id={description.id} label="Description" error={description.error}>
          <textarea {...description.attrs} rows={5} className={area} />
        </Row>

        <Row id={details.id} label="Details" error={details.error} hint="One detail per line.">
          <textarea {...details.attrs} rows={5} className={area} />
        </Row>

        <div className="flex flex-wrap items-center gap-6">
          <SubmitRow
            pending={pending}
            label={mode === "create" ? "Create product" : "Save changes"}
            pendingLabel="Saving…"
          />
          <Link href="/admin/products" className="link text-xs">
            Cancel
          </Link>
        </div>
      </fieldset>
    </form>
  );
}
