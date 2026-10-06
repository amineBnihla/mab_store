"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { signIn, signUp, type AuthFormState } from "@/app/(auth)/actions";
import { FieldError, Spinner } from "@/components/form-feedback";
import {
  fieldsFor,
  PASSWORD_MIN,
  validateField,
  type AuthField,
  type AuthMode,
  type FieldErrors,
} from "@/lib/auth-validation";

const copy = {
  "sign-in": {
    action: signIn,
    submit: "Sign in",
    pending: "Signing in…",
    switchPrompt: "New here?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
  },
  "sign-up": {
    action: signUp,
    submit: "Create account",
    pending: "Creating account…",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
} satisfies Record<AuthMode, unknown>;

export function AuthForm({ mode, next }: { mode: AuthMode; next?: string }) {
  const c = copy[mode];
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(c.action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Client errors, replaced by the server's whenever a new action result lands.
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLength, setPasswordLength] = useState(0);
  const [capsLock, setCapsLock] = useState(false);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setErrors(state.fieldErrors ?? {});
    // The form resets after each action, which clears the password.
    setPasswordLength(0);
  }

  // After a server response, move focus to what needs fixing.
  useEffect(() => {
    if (state.fieldErrors) {
      focusFirstInvalid(formRef.current, mode, state.fieldErrors);
    } else if (state.error) {
      alertRef.current?.focus();
    }
  }, [state, mode]);

  const withNext = (href: string) => (next ? `${href}?next=${encodeURIComponent(next)}` : href);
  const errorId = (field: AuthField) => `${id}-${field}-error`;

  function check(field: AuthField, value: string) {
    setErrors((prev) => ({ ...prev, [field]: validateField(mode, field, value) }));
  }

  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    const field = e.currentTarget.name as AuthField;
    // Don't flag a field the user merely tabbed through.
    if (e.currentTarget.value !== "" || errors[field]) check(field, e.currentTarget.value);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const field = e.currentTarget.name as AuthField;
    if (field === "password") setPasswordLength(e.currentTarget.value.length);
    // Once flagged, re-check as they type so the message clears as soon as it's fixed.
    if (errors[field]) check(field, e.currentTarget.value);
  }

  function onPasswordKey(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState("CapsLock"));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    const next: FieldErrors = {};
    for (const field of fieldsFor(mode)) {
      const value = data.get(field);
      const error = validateField(mode, field, typeof value === "string" ? value : "");
      if (error) next[field] = error;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      e.preventDefault();
      focusFirstInvalid(e.currentTarget, mode, next);
    }
  }

  const describedBy = (field: AuthField, hint?: string) =>
    [errors[field] && errorId(field), hint].filter(Boolean).join(" ") || undefined;

  const passwordMet = passwordLength >= PASSWORD_MIN;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
      className="space-y-6"
    >
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="border border-danger px-4 py-3 text-xs text-danger outline-none"
        >
          {state.error}
        </div>
      )}

      {/* `disabled` on a fieldset locks every control while the request is in flight. */}
      <fieldset disabled={pending} className="space-y-6">
        {mode === "sign-up" && (
          <div>
            <label htmlFor={`${id}-name`} className="field-label">
              Name
            </label>
            <input
              id={`${id}-name`}
              name="name"
              required
              autoComplete="name"
              defaultValue={state.name}
              onBlur={onBlur}
              onChange={onChange}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy("name")}
              className="field"
            />
            <FieldError id={errorId("name")} message={errors.name} />
          </div>
        )}

        <div>
          <label htmlFor={`${id}-email`} className="field-label">
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            defaultValue={state.email}
            onBlur={onBlur}
            onChange={onChange}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email")}
            className="field"
          />
          <FieldError id={errorId("email")} message={errors.email}>
            {state.emailTaken && errors.email && (
              <>
                {" "}
                <Link href={withNext("/sign-in")} className="link text-foreground">
                  Sign in instead
                </Link>
              </>
            )}
          </FieldError>
        </div>

        <div>
          <label htmlFor={`${id}-password`} className="field-label">
            Password
          </label>
          <div className="relative">
            <input
              id={`${id}-password`}
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "sign-up" ? PASSWORD_MIN : undefined}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              onBlur={(e) => {
                setCapsLock(false);
                onBlur(e);
              }}
              onChange={onChange}
              onKeyDown={onPasswordKey}
              onKeyUp={onPasswordKey}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={describedBy(
                "password",
                [mode === "sign-up" && !errors.password && `${id}-password-hint`, capsLock && `${id}-caps`]
                  .filter(Boolean)
                  .join(" ") || undefined,
              )}
              className="field pr-14"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-controls={`${id}-password`}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-nav absolute right-0 bottom-0 flex h-11 items-center text-2xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <FieldError id={errorId("password")} message={errors.password} />
          {mode === "sign-up" && !errors.password && (
            <p
              id={`${id}-password-hint`}
              className={`mt-2 text-2xs transition-colors ${passwordMet ? "text-success" : "text-muted-foreground"}`}
            >
              {passwordMet ? "✓ " : ""}At least {PASSWORD_MIN} characters.
            </p>
          )}
          {capsLock && (
            <p id={`${id}-caps`} className="mt-2 text-2xs text-muted-foreground">
              Caps Lock is on.
            </p>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-block">
          {pending && <Spinner />}
          {pending ? c.pending : c.submit}
        </button>
      </fieldset>

      <p className="text-center text-xs text-muted-foreground">
        {c.switchPrompt}{" "}
        <Link href={withNext(c.switchHref)} className="link text-foreground">
          {c.switchLabel}
        </Link>
      </p>
    </form>
  );
}

function focusFirstInvalid(form: HTMLFormElement | null, mode: AuthMode, errors: FieldErrors) {
  const first = fieldsFor(mode).find((field) => errors[field]);
  if (!first) return;
  const input = form?.elements.namedItem(first);
  if (input instanceof HTMLInputElement) input.focus();
}
