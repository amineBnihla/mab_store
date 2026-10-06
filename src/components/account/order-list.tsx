import Link from "next/link";

import { OrderStatusLabel } from "@/components/account/order-status";
import { formatPrice } from "@/lib/catalog";
import type { OrderSummary } from "@/lib/orders";

const orderDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

function pieces(n: number) {
  return `${n} ${n === 1 ? "piece" : "pieces"}`;
}

/** Order history rows, each linking to the order's details. */
export function OrderList({ orders }: { orders: OrderSummary[] }) {
  return (
    <ul className="border-t">
      {orders.map((order) => (
        <li key={order.id} className="border-b">
          <Link
            href={`/account/orders/${order.id}`}
            className="group grid gap-2 py-6 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6"
          >
            <div className="space-y-2">
              <p className="text-sm group-hover:underline">Order {order.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-2xs text-muted-foreground">
                <time dateTime={order.createdAt.toISOString()}>{orderDate.format(order.createdAt)}</time> ·{" "}
                {pieces(order.itemCount)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:gap-2">
              <OrderStatusLabel status={order.status} />
              <p className="text-sm font-medium">{formatPrice(order.totalCents)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
