import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseDetails,
  parsePriceCents,
  parseStock,
  parseStockDelta,
  slugify,
  validateImageUrl,
  validateProductForm,
  validateSlug,
} from "./admin-validation";

describe("slugify", () => {
  it("lowercases, strips accents and collapses separators", () => {
    assert.equal(slugify("  Café Crème — Coat! "), "cafe-creme-coat");
  });
  it("never ends with a hyphen after truncation", () => {
    const slug = slugify(`${"a".repeat(79)} b`);
    assert.ok(!slug.endsWith("-"));
    assert.ok(slug.length <= 80);
  });
  it("produces valid slugs or empty", () => {
    assert.equal(validateSlug(slugify("Wool Coat")), undefined);
    assert.equal(slugify("!!!"), "");
  });
});

describe("validateSlug", () => {
  it("rejects bad shapes", () => {
    for (const bad of ["", "Wool", "a--b", "-a", "a-", "a b"]) assert.ok(validateSlug(bad), bad);
  });
});

describe("parsePriceCents", () => {
  it("converts euros to integer cents", () => {
    assert.deepEqual(parsePriceCents("12.50"), { cents: 1250 });
    assert.deepEqual(parsePriceCents("12,5"), { cents: 1250 });
    assert.deepEqual(parsePriceCents("49"), { cents: 4900 });
    assert.deepEqual(parsePriceCents("0.07"), { cents: 7 });
  });
  it("rejects negatives, junk and absurd values", () => {
    for (const bad of ["", "-1", "abc", "1.234", "1e3", "999999999"]) {
      assert.ok("error" in parsePriceCents(bad), bad);
    }
  });
});

describe("parseStock", () => {
  it("accepts whole non-negative numbers", () => {
    assert.deepEqual(parseStock("0"), { quantity: 0 });
    assert.deepEqual(parseStock(" 12 "), { quantity: 12 });
  });
  it("rejects the rest", () => {
    for (const bad of ["", "-1", "1.5", "x", "9999999"]) assert.ok("error" in parseStock(bad), bad);
  });
});

describe("parseStockDelta", () => {
  it("accepts signed non-zero integers", () => {
    assert.deepEqual(parseStockDelta("5"), { delta: 5 });
    assert.deepEqual(parseStockDelta("+5"), { delta: 5 });
    assert.deepEqual(parseStockDelta("-2"), { delta: -2 });
  });
  it("rejects zero and junk", () => {
    for (const bad of ["", "0", "1.5", "a"]) assert.ok("error" in parseStockDelta(bad), bad);
  });
});

describe("validateImageUrl", () => {
  it("accepts https on an allowlisted host", () => {
    assert.equal(validateImageUrl("https://images.unsplash.com/photo-1?w=800"), undefined);
  });
  it("rejects http, other hosts and non-URLs", () => {
    assert.ok(validateImageUrl("http://images.unsplash.com/x"));
    assert.ok(validateImageUrl("https://evil.example/x.jpg"));
    assert.ok(validateImageUrl("https://images.unsplash.com.evil.example/x"));
    assert.ok(validateImageUrl("not a url"));
    assert.ok(validateImageUrl(""));
  });
});

describe("parseDetails", () => {
  it("splits lines and drops blanks", () => {
    assert.deepEqual(parseDetails("100% wool\r\n\n  Made in Italy "), { details: ["100% wool", "Made in Italy"] });
  });
  it("limits count and line length", () => {
    assert.ok("error" in parseDetails(Array(13).fill("x").join("\n")));
    assert.ok("error" in parseDetails("x".repeat(201)));
  });
});

describe("validateProductForm", () => {
  const good = {
    name: "Wool Coat",
    slug: "",
    categoryId: "0b9d3a52-6f0c-4d56-9a5f-1c7a2a0f9e11",
    price: "249.90",
    stock: "4",
    imageUrl: "https://images.unsplash.com/photo-1",
    badge: " ",
    description: "A coat.",
    details: "Wool\n\nItaly",
  };

  it("derives the slug on create and normalises values", () => {
    const result = validateProductForm(good, "create");
    assert.ok("product" in result);
    assert.deepEqual(result.product, {
      slug: "wool-coat",
      name: "Wool Coat",
      description: "A coat.",
      details: ["Wool", "Italy"],
      priceCents: 24990,
      imageUrl: "https://images.unsplash.com/photo-1",
      badge: null,
      categoryId: good.categoryId,
      stock: 4,
    });
  });

  it("requires a slug on edit and ignores stock", () => {
    const result = validateProductForm({ ...good, stock: "" }, "edit");
    assert.ok("errors" in result);
    assert.ok(result.errors.slug);
    assert.equal(result.errors.stock, undefined);
  });

  it("reports every invalid field", () => {
    const result = validateProductForm({}, "create");
    assert.ok("errors" in result);
    for (const field of ["name", "slug", "categoryId", "price", "stock", "imageUrl", "description"] as const) {
      assert.ok(result.errors[field], field);
    }
  });
});
