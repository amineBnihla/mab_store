import type { Metadata } from "next";

import { PasswordForm, ProfileForm } from "@/components/account/account-forms";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Account details", robots: { index: false } };

export default async function AccountDetailsPage() {
  const { user } = await requireUser("/account/details");

  return (
    <>
      <header className="mb-10">
        <p className="text-eyebrow mb-2 lg:hidden">My account</p>
        <h1 className="font-display text-3xl md:text-4xl">Account details</h1>
      </header>

      <section aria-labelledby="personal-info" className="border-t pt-8">
        <h2 id="personal-info" className="text-title mb-6 text-xs">
          Personal information
        </h2>
        <div className="max-w-form">
          <ProfileForm name={user.name} email={user.email} />
        </div>
      </section>

      <section aria-labelledby="password" className="mt-12 border-t pt-8">
        <h2 id="password" className="text-title mb-2 text-xs">
          Password
        </h2>
        <p className="mb-6 text-xs text-muted-foreground">
          Changing your password signs you out on every other device.
        </p>
        <div className="max-w-form">
          <PasswordForm />
        </div>
      </section>
    </>
  );
}
