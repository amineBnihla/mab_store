/**
 * Set a user's role: `npm run auth:set-role -- <email> <customer|admin>`.
 *
 * Roles can't be set through the auth API (`input: false`), so this is how
 * the first admin gets promoted. Builds its own client like `seed.ts`.
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { user } from "./auth-schema";

// Same precedence as Next.js and drizzle.config.ts.
config({ path: [".env.local", ".env"], quiet: true });

const ROLES = ["customer", "admin"] as const;

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role as (typeof ROLES)[number])) {
    throw new Error(`Usage: npm run auth:set-role -- <email> <${ROLES.join("|")}>`);
  }
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");

  const db = drizzle({ client: neon(process.env.DATABASE_URL) });
  const updated = await db
    .update(user)
    .set({ role })
    .where(eq(user.email, email.toLowerCase()))
    .returning({ id: user.id });

  if (updated.length === 0) throw new Error(`No user with email ${email}`);
  console.log(`${email} is now ${role}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
