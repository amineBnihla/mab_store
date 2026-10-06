"use client";

import { useEffect, useRef } from "react";

export function FieldError({
  id,
  message,
  children,
}: {
  id: string;
  message?: string;
  children?: React.ReactNode;
}) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-2xs text-danger">
      {message}
      {children}
    </p>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="size-3 animate-spin rounded-full border border-current border-t-transparent"
    />
  );
}

export function FormAlert({ message }: { message?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  if (!message) return null;
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="border border-danger px-4 py-3 text-xs text-danger outline-none"
    >
      {message}
    </div>
  );
}

export function SubmitRow({
  pending,
  label,
  pendingLabel,
  children,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <button type="submit" className="btn btn-primary w-full sm:w-auto">
        {pending && <Spinner />}
        {pending ? pendingLabel : label}
      </button>
      {/* Always mounted so screen readers announce the message when it appears. */}
      <p role="status" className="text-xs text-success">
        {children}
      </p>
    </div>
  );
}

export function focusField(form: HTMLFormElement | null, name: string) {
  const input = form?.elements.namedItem(name);
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) input.focus();
}
