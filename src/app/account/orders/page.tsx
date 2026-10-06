import type { Metadata } from "next";
import Link from "next/link";

import { OrderList } from "@/components/account/order-list";
import { getOrdersForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default async function OrdersPage() {
  const { user } = await requireUser("/account/orders");
  const orders = await getOrdersForUser(user.id);

  return (
    <>
      <header className="mb-10">
        <p className="text-eyebrow mb-2 lg:hidden">My account</p>
        <h1 className="font-display text-3xl md:text-4xl">Orders</h1>
      </header>

      {orders.length === 0 ? (
        <section className="space-y-6 border-t pt-8">
          <p className="text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Link href="/new" className="btn btn-outline">
            Shop new arrivals
          </Link>
        </section>
      ) : (
        <OrderList orders={orders} />
      )}
    </>
  );
}
