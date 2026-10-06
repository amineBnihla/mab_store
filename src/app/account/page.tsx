import type { Metadata } from "next";
import Link from "next/link";

import { OrderList } from "@/components/account/order-list";
import { getOrdersForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const memberSince = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

export default async function AccountPage() {
  const { user } = await requireUser("/account");
  const recentOrders = await getOrdersForUser(user.id, 3);

  return (
    <>
      <header className="mb-10">
        <p className="text-eyebrow mb-2 lg:hidden">My account</p>
        <h1 className="font-display text-3xl md:text-4xl">Hello, {user.name}</h1>
        <p className="mt-3 text-xs text-muted-foreground">
          Member since {memberSince.format(user.createdAt)}
        </p>
        {user.role === "admin" && (
          <p className="mt-3 text-xs">
            <Link href="/admin" className="link">
              Open admin
            </Link>
          </p>
        )}
      </header>

      <section aria-labelledby="account-info" className="border-t pt-8">
        <div className="mb-6 flex items-baseline justify-between gap-6">
          <h2 id="account-info" className="text-title text-xs">
            Account information
          </h2>
          <Link href="/account/details" className="link shrink-0 text-xs">
            Edit
          </Link>
        </div>
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="field-label">Name</dt>
            <dd className="text-sm break-words">{user.name}</dd>
          </div>
          <div>
            <dt className="field-label">Email</dt>
            <dd className="text-sm break-words">{user.email}</dd>
          </div>
          <div>
            <dt className="field-label">Password</dt>
            <dd className="text-sm">
              <span aria-hidden>••••••••</span>
              <span className="sr-only">Set</span>
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="recent-orders" className="mt-12 border-t pt-8">
        <div className="mb-6 flex items-baseline justify-between gap-6">
          <h2 id="recent-orders" className="text-title text-xs">
            Recent orders
          </h2>
          {recentOrders.length > 0 && (
            <Link href="/account/orders" className="link shrink-0 text-xs">
              View all
            </Link>
          )}
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
        ) : (
          <OrderList orders={recentOrders} />
        )}
      </section>
    </>
  );
}
