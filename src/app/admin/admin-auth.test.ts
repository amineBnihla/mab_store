/**
 * Structural guard for the admin area: every page and every exported server
 * action must call `requireAdmin()` itself (the proxy and layout aren't a
 * security boundary). Fails when someone adds an admin route or action
 * without the check.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";

const ADMIN_DIR = import.meta.dirname;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const files = walk(ADMIN_DIR);
const rel = (file: string) => relative(ADMIN_DIR, file);

describe("admin pages", () => {
  const pages = files.filter((f) => /(^|\/)(page|route)\.tsx?$/.test(f));

  it("finds the admin pages", () => {
    assert.ok(pages.length >= 8, `expected at least 8 pages, found ${pages.length}`);
  });

  for (const file of pages) {
    it(`${rel(file)} calls requireAdmin() before any other await`, () => {
      const source = readFileSync(file, "utf8");
      const check = source.indexOf("await requireAdmin()");
      assert.notEqual(check, -1, "missing await requireAdmin()");
      const firstAwait = source.indexOf("await ");
      assert.equal(check, firstAwait, "another await runs before requireAdmin()");
    });
  }
});

describe("admin server actions", () => {
  const actionFiles = files.filter((f) => /actions\.ts$/.test(f));

  it("finds the action files", () => {
    assert.ok(actionFiles.length >= 3);
  });

  for (const file of actionFiles) {
    const source = readFileSync(file, "utf8");

    it(`${rel(file)} is a "use server" module`, () => {
      assert.match(source, /^"use server";/);
    });

    // Every exported function is a callable endpoint, so each must check.
    const bodies = source.split(/^export (?:async )?function /m).slice(1);
    it(`${rel(file)} exports only async actions`, () => {
      assert.equal(bodies.length, (source.match(/^export async function /gm) ?? []).length);
    });

    for (const body of bodies) {
      const name = body.slice(0, body.indexOf("("));
      it(`${rel(file)} › ${name}() starts with requireAdmin()`, () => {
        const open = body.indexOf("{\n");
        const first = body.slice(open + 2).trimStart();
        assert.ok(first.startsWith("await requireAdmin();"), "first statement must be await requireAdmin()");
      });
    }
  }
});
