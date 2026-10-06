import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Types `session.user.role`. Display only — authorization happens on the server.
  plugins: [inferAdditionalFields<typeof auth>()],
});
