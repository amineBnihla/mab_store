"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  changePassword,
  updateProfile,
  type PasswordFormState,
  type ProfileFormState,
} from "@/app/account/actions";
import { FieldError, focusField, FormAlert, SubmitRow } from "@/components/form-feedback";
import { PASSWORD_MIN } from "@/lib/auth-validation";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {});
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setDirty(false);
  }

  useEffect(() => {
    if (state.fieldErrors?.name) focusField(formRef.current, "name");
  }, [state]);

  const nameError = dirty ? undefined : state.fieldErrors?.name;

  return (
    <form ref={formRef} action={formAction} noValidate aria-busy={pending} className="space-y-6">
      <FormAlert message={state.error} />

      <fieldset disabled={pending} className="space-y-6">
        <div>
          <label htmlFor={`${id}-name`} className="field-label">
            Name
          </label>
          <input
            id={`${id}-name`}
            name="name"
            required
            autoComplete="name"
            defaultValue={state.name ?? name}
            onChange={() => setDirty(true)}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? `${id}-name-error` : undefined}
            className="field"
          />
          <FieldError id={`${id}-name-error`} message={nameError} />
        </div>

        <div>
          <label htmlFor={`${id}-email`} className="field-label">
            Email
          </label>
          <input
            id={`${id}-email`}
            type="email"
            value={email}
            readOnly
            aria-describedby={`${id}-email-hint`}
            className="field border-line text-muted-foreground"
          />
          <p id={`${id}-email-hint`} className="mt-2 text-2xs text-muted-foreground">
            Your email address can&apos;t be changed online yet.
          </p>
        </div>

        <SubmitRow pending={pending} label="Save changes" pendingLabel="Saving…">
          {state.success && !dirty && "Your details have been saved."}
        </SubmitRow>
      </fieldset>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordFormState, FormData>(changePassword, {});
  const [errors, setErrors] = useState<PasswordFormState["fieldErrors"]>({});
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setErrors(state.fieldErrors ?? {});
    setDirty(false);
  }

  useEffect(() => {
    const first = (["currentPassword", "newPassword"] as const).find((f) => state.fieldErrors?.[f]);
    if (first) focusField(formRef.current, first);
  }, [state]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const field = e.currentTarget.name as "currentPassword" | "newPassword";
    setDirty(true);
    // Clear a flagged field's message once they start fixing it.
    if (errors?.[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  return (
    <form ref={formRef} action={formAction} noValidate aria-busy={pending} className="space-y-6">
      <FormAlert message={state.error} />

      <fieldset disabled={pending} className="space-y-6">
        <PasswordField
          id={`${id}-current`}
          name="currentPassword"
          label="Current password"
          autoComplete="current-password"
          error={errors?.currentPassword}
          onChange={onChange}
        />
        <PasswordField
          id={`${id}-new`}
          name="newPassword"
          label="New password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN} characters.`}
          error={errors?.newPassword}
          onChange={onChange}
        />

        <SubmitRow pending={pending} label="Change password" pendingLabel="Changing password…">
          {state.success && !dirty && "Your password has been changed."}
        </SubmitRow>
      </fieldset>
    </form>
  );
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  hint,
  error,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  hint?: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [show, setShow] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="field pr-14"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-controls={id}
          aria-pressed={show}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="text-nav absolute right-0 bottom-0 flex h-11 items-center text-2xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      <FieldError id={`${id}-error`} message={error} />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-2xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
