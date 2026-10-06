"use client";

import { useActionState } from "react";

import { startCheckout, type CheckoutState } from "@/app/checkout/actions";
import { Spinner } from "@/components/form-feedback";

/** Sends the bag to Stripe Checkout. Prices and quantities are re-read on the server. */
export function CheckoutButton({ blocked, signedIn }: { blocked: boolean; signedIn: boolean }) {
  const [state, formAction, pending] = useActionState<CheckoutState>(startCheckout, {});

  return (
    <form action={formAction} aria-busy={pending} className="space-y-3">
      <button type="submit" className="btn btn-primary btn-block" disabled={blocked || pending}>
        {pending && <Spinner />}
        {pending ? "Redirecting to payment…" : "Checkout"}
      </button>
      {/* Always mounted so screen readers announce the message when it appears. */}
      <p role="status" className="text-center text-2xs">
        {!pending && state.error ? (
          <span className="text-danger">{state.error}</span>
        ) : blocked ? (
          <span className="text-muted-foreground">Remove sold-out pieces to continue.</span>
        ) : pending ? (
          <span className="text-muted-foreground">Checking availability and reserving your pieces.</span>
        ) : signedIn ? (
          <span className="text-muted-foreground">Secure payment by Stripe.</span>
        ) : (
          <span className="text-muted-foreground">You&apos;ll sign in, then pay securely with Stripe.</span>
        )}
      </p>
    </form>
  );
}
