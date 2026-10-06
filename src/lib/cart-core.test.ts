import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampQuantity,
  MAX_LINES,
  MAX_QTY_PER_LINE,
  parseBag,
  reconcileBag,
  serializeBag,
  setEntry,
} from "./cart-core";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

function uuid(n: number) {
  return `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
}

describe("parseBag", () => {
  it("returns an empty bag for missing or malformed cookies", () => {
    for (const raw of [undefined, "", "not json", "{}", "null", '"x"', "42"]) {
      assert.deepEqual(parseBag(raw), [], String(raw));
    }
  });

  it("drops invalid ids and quantities", () => {
    const raw = JSON.stringify([
      { id: "nope", q: 1 },
      { id: A, q: 0 },
      { id: A, q: -3 },
      { id: A, q: 1.5 },
      { id: A, q: "2" },
      null,
      [A, 1],
      { id: B, q: 2 },
    ]);
    assert.deepEqual(parseBag(raw), [{ id: B, q: 2 }]);
  });

  it("merges duplicate ids (case-insensitively) and caps quantities", () => {
    const raw = JSON.stringify([
      { id: A, q: 2 },
      { id: A.toUpperCase(), q: 3 },
      { id: B, q: 9999 },
    ]);
    assert.deepEqual(parseBag(raw), [
      { id: A, q: 5 },
      { id: B, q: MAX_QTY_PER_LINE },
    ]);
  });

  it(`keeps at most ${MAX_LINES} lines`, () => {
    const raw = JSON.stringify(Array.from({ length: MAX_LINES + 10 }, (_, i) => ({ id: uuid(i), q: 1 })));
    const bag = parseBag(raw);
    assert.equal(bag.length, MAX_LINES);
    assert.equal(bag.at(-1)?.id, uuid(MAX_LINES - 1));
  });

  it("round-trips through serializeBag", () => {
    const bag = [
      { id: A, q: 1 },
      { id: B, q: 4 },
    ];
    assert.deepEqual(parseBag(serializeBag(bag)), bag);
  });
});

describe("clampQuantity", () => {
  it("allows quantities up to stock", () => {
    assert.deepEqual(clampQuantity(3, 3), { quantity: 3, clamped: false });
    assert.deepEqual(clampQuantity(2, 10), { quantity: 2, clamped: false });
  });

  it("clamps above stock", () => {
    assert.deepEqual(clampQuantity(4, 3), { quantity: 3, clamped: true });
  });

  it("clamps to zero when sold out", () => {
    assert.deepEqual(clampQuantity(1, 0), { quantity: 0, clamped: true });
  });

  it("clamps to the per-line cap even with plenty of stock", () => {
    assert.deepEqual(clampQuantity(MAX_QTY_PER_LINE + 1, 500), { quantity: MAX_QTY_PER_LINE, clamped: true });
  });
});

describe("setEntry", () => {
  it("adds, updates and removes lines", () => {
    let bag = setEntry([], A, 1);
    bag = setEntry(bag, B, 2);
    bag = setEntry(bag, A, 3);
    assert.deepEqual(bag, [
      { id: A, q: 3 },
      { id: B, q: 2 },
    ]);
    assert.deepEqual(setEntry(bag, A.toUpperCase(), 0), [{ id: B, q: 2 }]);
  });
});

describe("reconcileBag", () => {
  const products = [
    { id: A, priceCents: 12_950, stock: 10 },
    { id: B, priceCents: 4_99, stock: 2 },
    { id: C, priceCents: 89_00, stock: 0 },
  ];

  it("prices lines live, clamps to stock and skips sold-out lines in the subtotal", () => {
    const bag = [
      { id: A, q: 2 },
      { id: B, q: 5 },
      { id: C, q: 1 },
      { id: uuid(99), q: 1 }, // product deleted
    ];
    const { lines, subtotalCents, itemCount } = reconcileBag(bag, products);

    assert.deepEqual(
      lines.map(({ product, requested, quantity, lineTotalCents, status }) => ({
        id: product.id,
        requested,
        quantity,
        lineTotalCents,
        status,
      })),
      [
        { id: A, requested: 2, quantity: 2, lineTotalCents: 25_900, status: "ok" },
        { id: B, requested: 5, quantity: 2, lineTotalCents: 998, status: "reduced" },
        { id: C, requested: 1, quantity: 0, lineTotalCents: 0, status: "sold-out" },
      ],
    );
    assert.equal(subtotalCents, 26_898);
    assert.equal(itemCount, 4);
  });

  it("is empty for an empty bag", () => {
    assert.deepEqual(reconcileBag([], products), { lines: [], subtotalCents: 0, itemCount: 0 });
  });
});
