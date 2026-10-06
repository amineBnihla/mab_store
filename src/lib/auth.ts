import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db, schema } from "@/db";
import { env } from "@/env";
import { site } from "@/lib/site";

export const auth = betterAuth({
  appName: site.name,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    // No email sender in v1, so verification can't be required yet.
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // No cookieCache: every session check reads the DB, so sign-outs and role
    // changes take effect on the next request.
  },
  user: {
    additionalFields: {
      // `input: false` keeps clients from setting it at sign-up or via update-user.
      // Promote with `npm run auth:set-role -- <email> admin`.
      role: { type: "string", required: true, defaultValue: "customer", input: false },
    },
  },
  // Keep `nextCookies` last so it can wrap the responses of every other plugin.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
