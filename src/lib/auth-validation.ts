/**
 * Auth form validation shared by the client form (instant feedback) and the
 * server actions (authoritative). Limits mirror `src/lib/auth.ts`.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128; // Better Auth's default maxPasswordLength
export const NAME_MAX = 100;

export type AuthMode = "sign-in" | "sign-up";
export type AuthField = "name" | "email" | "password";
export type FieldErrors = Partial<Record<AuthField, string>>;

// Deliberately loose: one @, something on each side, a dot in the domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateField(mode: AuthMode, field: AuthField, value: string): string | undefined {
  switch (field) {
    case "name": {
      const name = value.trim();
      if (!name) return "Enter your name.";
      if (name.length > NAME_MAX) return `Keep your name under ${NAME_MAX} characters.`;
      return;
    }
    case "email": {
      const email = value.trim();
      if (!email) return "Enter your email address.";
      if (!EMAIL_RE.test(email)) return "Enter a valid email address, like name@example.com.";
      return;
    }
    case "password": {
      if (!value) return mode === "sign-up" ? "Choose a password." : "Enter your password.";
      if (mode === "sign-in") return;
      if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
      if (value.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
      return;
    }
  }
}

export function fieldsFor(mode: AuthMode): AuthField[] {
  return mode === "sign-up" ? ["name", "email", "password"] : ["email", "password"];
}

export function validateAuthForm(mode: AuthMode, values: Record<AuthField, string>): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fieldsFor(mode)) {
    const error = validateField(mode, field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}
