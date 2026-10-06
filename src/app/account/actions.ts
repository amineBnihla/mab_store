"use server";

import { APIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { validateField } from "@/lib/auth-validation";
import { requireUser } from "@/lib/session";

export type ProfileFormState = {
  error?: string;
  fieldErrors?: { name?: string };
  success?: boolean;
  name?: string;
};

export type PasswordFormState = {
  error?: string;
  fieldErrors?: { currentPassword?: string; newPassword?: string };
  success?: boolean;
};

const RATE_LIMITED = "Too many attempts. Please wait a moment and try again.";
const UNAVAILABLE = "Something went wrong on our side. Please try again.";

function value(formData: FormData, name: string) {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const { user } = await requireUser("/account/details");
  const name = value(formData, "name").trim();

  const nameError = validateField("sign-up", "name", name);
  if (nameError) return { fieldErrors: { name: nameError }, name };
  if (name === user.name) return { success: true, name };

  try {
    await auth.api.updateUser({ body: { name }, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 429) return { error: RATE_LIMITED, name };
    console.error("update-user failed", error);
    return { error: UNAVAILABLE, name };
  }

  // The new name shows in the account header and overview, both rendered on the server.
  refresh();
  return { success: true, name };
}

export async function changePassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  await requireUser("/account/details");
  const currentPassword = value(formData, "currentPassword");
  const newPassword = value(formData, "newPassword");

  const fieldErrors: PasswordFormState["fieldErrors"] = {};
  if (!currentPassword) fieldErrors.currentPassword = "Enter your current password.";
  const newError = validateField("sign-up", "password", newPassword);
  if (newError) fieldErrors.newPassword = newError === "Choose a password." ? "Choose a new password." : newError;
  else if (newPassword === currentPassword) fieldErrors.newPassword = "Choose a password you aren't already using.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    // Signs out every other device; `nextCookies()` sets this device's fresh session cookie.
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (error) {
    if (!(error instanceof APIError)) {
      console.error("change-password failed", error);
      return { error: UNAVAILABLE };
    }
    if (error.statusCode === 429) return { error: RATE_LIMITED };
    switch (error.body?.code) {
      case "INVALID_PASSWORD":
        return { fieldErrors: { currentPassword: "That isn't your current password." } };
      case "PASSWORD_TOO_SHORT":
      case "PASSWORD_TOO_LONG":
        return { fieldErrors: { newPassword: error.body?.message ?? "Choose a different password." } };
    }
    return { error: error.body?.message ?? "We couldn't change your password." };
  }

  return { success: true };
}
