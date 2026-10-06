import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusLabel } from "@/components/account/order-status";
import { formatPrice } from "@/lib/catalog";
import { getOrderById } from "@/lib/orders";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Order · Admin", robots: { index: false } };

const stamp = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="field-label">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const address = order.shippingAddress;
  const addressLines = address
    ? [address.line1, address.line2, [address.postalCode, address.city].filter(Boolean).join(" "), address.state, address.country].filter(Boolean)
    : [];

  return (
    <>
      <header className="mb-10">
        <Link href="/admin/orders" className="link text-xs">
          ← All orders
        </Link>
        <h1 className="font-display mt-4 text-3xl md:text-4xl">Order {order.id.slice(0, 8).toUpperCase()}</h1>
        <div className="mt-3">
          <OrderStatusLabel status={order.status} />
        </div>
      </header>

      <section aria-labelledby="order-items" className="max-w-3xl border-t pt-8">
        <h2 id="order-items" className="text-title mb-6 text-xs">
          Items
        </h2>
        <ul className="border-t">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-baseline justify-between gap-6 border-b py-4 text-sm">
              <span className="min-w-0">
                <Link href={`/admin/products/${item.productId}/edit`} className="link">
                  {item.productName}
                </Link>
                <span className="text-muted-foreground"> × {item.quantity}</span>
              </span>
              <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between text-sm font-medium">
          <span>Total</span>
          <span>{formatPrice(order.totalCents)}</span>
        </p>
      </section>

      <section aria-labelledby="order-info" className="mt-12 max-w-3xl border-t pt-8">
        <h2 id="order-info" className="text-title mb-6 text-xs">
          Details
        </h2>
        <dl className="grid gap-6 sm:grid-cols-2">
          <Item label="Customer email">{order.email}</Item>
          <Item label="Placed">{stamp.format(order.createdAt)}</Item>
          <Item label="Paid">{order.paidAt ? stamp.format(order.paidAt) : "—"}</Item>
          <Item label="Stock returned">{order.stockReleasedAt ? stamp.format(order.stockReleasedAt) : "—"}</Item>
          <Item label="Ship to">
            {order.shippingName || addressLines.length ? (
              <>
                {order.shippingName && <span className="block">{order.shippingName}</span>}
                {addressLines.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </>
            ) : (
              "—"
            )}
          </Item>
          <Item label="Stripe">
            <span className="block font-mono text-2xs">{order.stripeCheckoutSessionId ?? "No session"}</span>
            {order.stripePaymentIntentId && <span className="block font-mono text-2xs">{order.stripePaymentIntentId}</span>}
          </Item>
        </dl>
      </section>
    </>
  );
}
