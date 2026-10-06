import type { Metadata } from "next";
import Link from "next/link";

import { OrderStatusLabel } from "@/components/account/order-status";
import { formatPrice } from "@/lib/catalog";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-core";
import { getAllOrders } from "@/lib/orders";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Orders · Admin", robots: { index: false } };

const orderDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const LIMIT = 100;

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const { status: raw } = await searchParams;
  const status = ORDER_STATUSES.find((s) => s === raw) as OrderStatus | undefined;
  const orders = await getAllOrders({ status, limit: LIMIT });

  const filters: { href: string; label: string; current: boolean }[] = [
    { href: "/admin/orders", label: "All", current: !status },
    ...ORDER_STATUSES.map((s) => ({ href: `/admin/orders?status=${s}`, label: s, current: s === status })),
  ];

  return (
    <>
      <header className="mb-8">
        <p className="text-eyebrow mb-2 lg:hidden">Admin</p>
        <h1 className="font-display text-3xl md:text-4xl">Orders</h1>
      </header>

      <nav aria-label="Filter by status" className="mb-8">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {filters.map((f) => (
            <li key={f.href}>
              <Link
                href={f.href}
                aria-current={f.current ? "page" : undefined}
                className={`text-nav border-b py-1 capitalize ${
                  f.current ? "border-line-strong" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="border-t pt-8 text-sm text-muted-foreground">No orders{status ? ` with status “${status}”` : ""}.</p>
      ) : (
        <>
          <ul className="border-t">
            {orders.map((o) => (
              <li key={o.id} className="border-b">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="group grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm group-hover:underline">Order {o.id.slice(0, 8).toUpperCase()}</p>
                    <p className="truncate text-2xs text-muted-foreground">
                      {o.email} · <time dateTime={o.createdAt.toISOString()}>{orderDate.format(o.createdAt)}</time> ·{" "}
                      {o.itemCount} {o.itemCount === 1 ? "piece" : "pieces"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:gap-2">
                    <OrderStatusLabel status={o.status} />
                    <p className="text-sm font-medium">{formatPrice(o.totalCents)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {orders.length === LIMIT && (
            <p className="mt-6 text-2xs text-muted-foreground">Showing the latest {LIMIT} orders.</p>
          )}
        </>
      )}
    </>
  );
}
