import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AwaitPayment } from "@/components/account/await-payment";
import { OrderStatusLabel } from "@/components/account/order-status";
import { isProductId } from "@/lib/cart-core";
import { formatPrice } from "@/lib/catalog";
import type { OrderStatus } from "@/lib/order-core";
import { getOrderForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

const orderDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

const statusNote: Partial<Record<OrderStatus, string>> = {
  pending: "We haven't received your payment yet.",
  processing: "Your payment is being processed. We'll confirm your order as soon as it clears.",
  paid: "Thank you. Your order is confirmed and will ship by complimentary express delivery.",
  failed: "Your payment didn't go through, so you haven't been charged. The pieces are back in stock.",
  expired: "This checkout expired before payment, so you haven't been charged.",
  canceled: "This checkout was canceled, so you haven't been charged.",
};

function pieces(n: number) {
  return `${n} ${n === 1 ? "piece" : "pieces"}`;
}

export default async function OrderPage({ params, searchParams }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const { user } = await requireUser(`/account/orders/${id}`);
  const order = isProductId(id) ? await getOrderForUser(user.id, id) : undefined;
  if (!order) notFound();
  const placed = (await searchParams).placed === "1";
  const address = order.shippingAddress;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  // Back from Stripe but the payment webhook hasn't landed yet.
  const confirming = placed && order.status === "pending";
  const note = confirming
    ? "We're confirming your payment with Stripe. This page will update in a moment."
    : statusNote[order.status];

  return (
    <>
      <header className="mb-10 space-y-3">
        <Link href="/account/orders" className="link text-2xs">
          All orders
        </Link>
        <h1 className="font-display text-3xl md:text-4xl">
          {placed ? "Thank you for your order" : `Order ${order.id.slice(0, 8).toUpperCase()}`}
        </h1>
        <p className="text-xs text-muted-foreground">
          {placed && <>Order {order.id.slice(0, 8).toUpperCase()} · </>}
          Placed <time dateTime={order.createdAt.toISOString()}>{orderDate.format(order.createdAt)}</time>
        </p>
      </header>

      <section aria-labelledby="status-heading" className="space-y-3 border-t pt-8 pb-8">
        <h2 id="status-heading" className="sr-only">
          Status
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <OrderStatusLabel status={order.status} />
          {order.paidAt && (
            <p className="text-2xs text-muted-foreground">
              Paid <time dateTime={order.paidAt.toISOString()}>{orderDate.format(order.paidAt)}</time>
            </p>
          )}
        </div>
        {note && (
          <p role="status" className="text-sm text-muted-foreground">
            {note}
          </p>
        )}
        {confirming && <AwaitPayment />}
        {(order.status === "failed" || order.status === "expired" || order.status === "canceled") && (
          <Link href="/bag" className="btn btn-outline btn-sm">
            Go to your bag
          </Link>
        )}
      </section>

      <section aria-labelledby="items-heading" className="border-t pt-8">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 id="items-heading" className="text-title text-xs">
            Your selections
          </h2>
          <p className="text-2xs text-muted-foreground">{pieces(itemCount)}</p>
        </div>
        <ul>
          {order.items.map((item) => (
            <li key={item.productId} className="grid grid-cols-[5rem_1fr_auto] gap-4 border-b py-6 sm:gap-6">
              <Link href={`/products/${item.slug}`} tabIndex={-1} aria-hidden className="media-frame aspect-product block">
                <Image src={item.image} alt="" fill sizes="5rem" />
              </Link>
              <div className="min-w-0 space-y-1">
                <p className="text-sm">
                  <Link href={`/products/${item.slug}`} className="link-quiet">
                    {item.productName}
                  </Link>
                </p>
                <p className="text-2xs text-muted-foreground">
                  {formatPrice(item.unitPriceCents)} each · Qty: {item.quantity}
                </p>
              </div>
              <p className="text-sm font-medium">{formatPrice(item.unitPriceCents * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-3 pt-6 text-xs">
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd>{formatPrice(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Shipping</dt>
            <dd className="text-muted-foreground">Complimentary (express)</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t pt-4">
            <dt className="font-medium tracking-eyebrow uppercase">Total</dt>
            <dd className="text-lg">{formatPrice(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      {address && (
        <section aria-labelledby="shipping-heading" className="mt-10 border-t pt-8">
          <h2 id="shipping-heading" className="text-title mb-4 text-xs">
            Delivery address
          </h2>
          <address className="text-sm not-italic leading-relaxed">
            {order.shippingName && <>{order.shippingName}<br /></>}
            {address.line1}
            {address.line2 && <><br />{address.line2}</>}
            <br />
            {[address.postalCode, address.city].filter(Boolean).join(" ")}
            {address.state && <>, {address.state}</>}
            <br />
            {address.country}
          </address>
        </section>
      )}
    </>
  );
}
