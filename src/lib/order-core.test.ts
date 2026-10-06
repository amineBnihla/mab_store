import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canTransition,
  ORDER_STATUSES,
  orderTotalCents,
  releasesStock,
  sessionMismatch,
  statusForSession,
  toStripeLineItems,
  type OrderLine,
  type SessionSnapshot,
} from "./order-core";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const P1 = "22222222-2222-4222-8222-222222222222";
const P2 = "33333333-3333-4333-8333-333333333333";

const lines: OrderLine[] = [
  { productId: P1, productName: "Silk scarf", unitPriceCents: 45000, quantity: 2 },
  { productId: P2, productName: "Leather tote", unitPriceCents: 189050, quantity: 1 },
];

const order = { id: ORDER_ID, totalCents: 279050, stripeCheckoutSessionId: "cs_test_1" };

function session(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    id: "cs_test_1",
    client_reference_id: ORDER_ID,
    metadata: { order_id: ORDER_ID },
    amount_total: 279050,
    currency: "eur",
    payment_status: "paid",
    status: "complete",
    ...overrides,
  };
}

describe("toStripeLineItems", () => {
  it("uses the snapshot price and quantity in EUR cents", () => {
    assert.deepEqual(toStripeLineItems(lines), [
      {
        quantity: 2,
        price_data: {
          currency: "eur",
          unit_amount: 45000,
          product_data: { name: "Silk scarf", metadata: { product_id: P1 } },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: 189050,
          product_data: { name: "Leather tote", metadata: { product_id: P2 } },
        },
      },
    ]);
  });

  it("totals the snapshot", () => {
    assert.equal(orderTotalCents(lines), 279050);
    assert.equal(orderTotalCents([]), 0);
  });
});

describe("canTransition", () => {
  it("allows the happy paths", () => {
    assert.ok(canTransition("pending", "paid"));
    assert.ok(canTransition("pending", "processing"));
    assert.ok(canTransition("processing", "paid"));
    assert.ok(canTransition("processing", "failed"));
    assert.ok(canTransition("pending", "expired"));
    assert.ok(canTransition("pending", "canceled"));
  });

  it("never leaves a terminal status, including repeats", () => {
    for (const from of ["paid", "expired", "failed", "canceled"] as const) {
      for (const to of ORDER_STATUSES) assert.equal(canTransition(from, to), false, `${from} -> ${to}`);
    }
  });

  it("doesn't expire or cancel an order whose payment is settling", () => {
    assert.equal(canTransition("processing", "expired"), false);
    assert.equal(canTransition("processing", "canceled"), false);
    assert.equal(canTransition("processing", "processing"), false);
  });

  it("returns stock only for failed outcomes", () => {
    assert.deepEqual(ORDER_STATUSES.filter(releasesStock), ["expired", "failed", "canceled"]);
  });
});

describe("sessionMismatch", () => {
  it("accepts a matching session", () => {
    assert.equal(sessionMismatch(session(), order), null);
  });

  it("rejects a session for another order", () => {
    assert.equal(sessionMismatch(session({ metadata: { order_id: P1 } }), order), "metadata.order_id");
    assert.equal(sessionMismatch(session({ metadata: null }), order), "metadata.order_id");
    assert.equal(sessionMismatch(session({ client_reference_id: P1 }), order), "client_reference_id");
    assert.equal(sessionMismatch(session({ id: "cs_test_other" }), order), "session id");
  });

  it("rejects a different amount or currency", () => {
    assert.equal(sessionMismatch(session({ amount_total: 1 }), order), "amount_total");
    assert.equal(sessionMismatch(session({ amount_total: null }), order), "amount_total");
    assert.equal(sessionMismatch(session({ currency: "usd" }), order), "currency");
  });
});

describe("statusForSession", () => {
  it("maps completed sessions by payment status", () => {
    assert.equal(statusForSession({ status: "complete", payment_status: "paid" }), "paid");
    assert.equal(statusForSession({ status: "complete", payment_status: "no_payment_required" }), "paid");
    assert.equal(statusForSession({ status: "complete", payment_status: "unpaid" }), "processing");
  });

  it("ignores sessions that aren't complete", () => {
    assert.equal(statusForSession({ status: "open", payment_status: "unpaid" }), null);
    assert.equal(statusForSession({ status: "expired", payment_status: "unpaid" }), null);
    assert.equal(statusForSession({ status: null, payment_status: "paid" }), null);
  });

  it("never treats an unknown payment status as paid", () => {
    assert.equal(statusForSession({ status: "complete", payment_status: "requires_review" }), null);
  });
});
