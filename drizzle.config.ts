import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js reads `.env.local` first; mirror that order so the CLI and the app
// always talk to the same database.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
