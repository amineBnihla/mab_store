"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { validateAuthForm, type FieldErrors } from "@/lib/auth-validation";
import { safeNext } from "@/lib/session";

export type AuthFormState = {
  /** Form-level message (credentials, rate limit, server trouble). */
  error?: string;
  fieldErrors?: FieldErrors;
  /** Sign-up hit an existing account; the form offers a sign-in link. */
  emailTaken?: boolean;
  email?: string;
  name?: string;
};

const RATE_LIMITED = "Too many attempts. Please wait a moment and try again.";
const UNAVAILABLE = "Something went wrong on our side. Please try again.";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function password(formData: FormData) {
  const value = formData.get("password");
  return typeof value === "string" ? value : "";
}

function hasErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0;
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const pw = password(formData);

  const fieldErrors = validateAuthForm("sign-up", { name, email, password: pw });
  if (hasErrors(fieldErrors)) return { fieldErrors, name, email };

  try {
    // `nextCookies()` sets the session cookie on this action's response.
    await auth.api.signUpEmail({ body: { name, email, password: pw }, headers: await headers() });
  } catch (error) {
    if (!(error instanceof APIError)) {
      console.error("sign-up failed", error);
      return { error: UNAVAILABLE, name, email };
    }
    if (error.statusCode === 429) return { error: RATE_LIMITED, name, email };
    switch (error.body?.code) {
      case "USER_ALREADY_EXISTS":
      case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
        return {
          fieldErrors: { email: "An account with this email already exists." },
          emailTaken: true,
          name,
          email,
        };
      case "INVALID_EMAIL":
        return { fieldErrors: { email: "Enter a valid email address." }, name, email };
      case "PASSWORD_TOO_SHORT":
      case "PASSWORD_TOO_LONG":
        return { fieldErrors: { password: error.body?.message ?? "Choose a different password." }, name, email };
    }
    return { error: error.body?.message ?? "We couldn't create your account.", name, email };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email");
  const pw = password(formData);

  const fieldErrors = validateAuthForm("sign-in", { name: "", email, password: pw });
  if (hasErrors(fieldErrors)) return { fieldErrors, email };

  try {
    await auth.api.signInEmail({
      body: { email, password: pw, rememberMe: true },
      headers: await headers(),
    });
  } catch (error) {
    if (!(error instanceof APIError)) {
      console.error("sign-in failed", error);
      return { error: UNAVAILABLE, email };
    }
    if (error.statusCode === 429) return { error: RATE_LIMITED, email };
    // Same message for unknown email and wrong password.
    return { error: "Incorrect email or password. Check them and try again.", email };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
