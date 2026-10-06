import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession, safeNext } from "@/lib/session";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);

  return (
    <div className="mx-auto max-w-form">
      <header className="mb-10 text-center">
        <p className="text-eyebrow mb-2">My account</p>
        <h1 className="font-display text-3xl md:text-4xl">Create an account</h1>
      </header>
      <AuthForm mode="sign-up" next={next} />
    </div>
  );
}
