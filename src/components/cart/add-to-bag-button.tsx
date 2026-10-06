"use client";

import Link from "next/link";
import { useActionState } from "react";

import { addToBag, type BagActionState } from "@/app/bag/actions";
import { Spinner } from "@/components/form-feedback";

export function AddToBagButton({ productId, soldOut }: { productId: string; soldOut: boolean }) {
  const [state, formAction, pending] = useActionState<BagActionState, FormData>(addToBag, {});

  return (
    <form action={formAction} aria-busy={pending} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" className="btn btn-primary btn-block" disabled={soldOut || pending}>
        {pending && <Spinner />}
        {soldOut ? "Out of stock" : pending ? "Adding…" : "Add to bag"}
      </button>
      {/* Always mounted so screen readers announce the message when it appears. */}
      <p role="status" className="text-xs">
        {!pending && state.error && <span className="text-danger">{state.error} </span>}
        {!pending && state.success && (
          <span>{state.notice ?? "Added to your bag."} </span>
        )}
        {!pending && (state.success || state.error) && (
          <Link href="/bag" className="link">
            View bag
          </Link>
        )}
      </p>
    </form>
  );
}
