"use client";

import { useState } from "react";

import { ArrowRightIcon } from "@/components/icons";

export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <p className="text-xs">Thank you — you&apos;re on the list.</p>;
  }

  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email
      </label>
      <input
        id="newsletter-email"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="Email"
        className="field pr-10"
      />
      <button
        type="submit"
        className="btn-icon absolute right-0 bottom-0.5"
        aria-label="Subscribe"
      >
        <ArrowRightIcon width={16} height={16} />
      </button>
    </form>
  );
}
