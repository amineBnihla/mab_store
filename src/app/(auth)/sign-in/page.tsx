import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession, safeNext } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);

  return (
    <div className="mx-auto max-w-form">
      <header className="mb-10 text-center">
        <p className="text-eyebrow mb-2">My account</p>
        <h1 className="font-display text-3xl md:text-4xl">Sign in</h1>
      </header>
      <AuthForm mode="sign-in" next={next} />
    </div>
  );
}
