"use client";

import { useActionState, useId } from "react";

import { adjustStockAction, setStockAction, type StockFormState } from "@/app/admin/stock/actions";
import { Spinner } from "@/components/form-feedback";

/** Two ways to change one product's stock: overwrite it, or add/remove units. */
export function StockForms({ id, name }: { id: string; name: string }) {
  const [setState, setAction, setting] = useActionState<StockFormState, FormData>(setStockAction, {});
  const [adjState, adjAction, adjusting] = useActionState<StockFormState, FormData>(adjustStockAction, {});
  const uid = useId();
  const error = setState.error ?? adjState.error;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <form action={setAction} noValidate aria-busy={setting} className="flex items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <div className="w-20">
            <label htmlFor={`${uid}-set`} className="field-label">
              Set to
            </label>
            <input id={`${uid}-set`} name="quantity" inputMode="numeric" aria-label={`Set stock for ${name}`} className="field" />
          </div>
          <button type="submit" disabled={setting} className="btn btn-outline btn-sm">
            {setting && <Spinner />}
            Set
          </button>
        </form>
        <form action={adjAction} noValidate aria-busy={adjusting} className="flex items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <div className="w-20">
            <label htmlFor={`${uid}-adj`} className="field-label">
              Change by
            </label>
            <input id={`${uid}-adj`} name="delta" inputMode="numeric" placeholder="+5" aria-label={`Change stock for ${name}`} className="field" />
          </div>
          <button type="submit" disabled={adjusting} className="btn btn-outline btn-sm">
            {adjusting && <Spinner />}
            Apply
          </button>
        </form>
      </div>
      <p role="status" className="mt-2 text-2xs empty:hidden">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : (
          (setState.success || adjState.success) && <span className="text-success">Stock updated.</span>
        )}
      </p>
    </div>
  );
}
