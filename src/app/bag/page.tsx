import type { Metadata } from "next";
import Link from "next/link";

import { BagLine } from "@/components/cart/bag-line";
import { CheckoutButton } from "@/components/cart/checkout-button";
import { ChevronDownIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { ProductRail } from "@/components/product/product-rail";
import { formatPrice, services } from "@/lib/catalog";
import { getBag } from "@/lib/cart";
import { getNewArrivals } from "@/lib/products";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Shopping bag", robots: { index: false } };

const accordionSummary =
  "flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-2xs font-medium tracking-eyebrow uppercase [&::-webkit-details-marker]:hidden";

function pieces(n: number) {
  return `${n} ${n === 1 ? "piece" : "pieces"}`;
}

/** Where the shopper came back from Stripe without paying (`?checkout=`). */
const checkoutNotices = {
  canceled: {
    title: "Checkout canceled",
    body: "You haven't been charged. Your bag is just as you left it whenever you're ready.",
  },
  expired: {
    title: "Your checkout session expired",
    body: "You haven't been charged. Pieces are no longer held for you, so please check out again.",
  },
  failed: {
    title: "Your payment didn't go through",
    body: "You haven't been charged. Please try again or choose another payment method.",
  },
} as const;

export default async function BagPage({ searchParams }: PageProps<"/bag">) {
  const [{ lines, subtotalCents, itemCount, openCheckout }, arrivals, session, { checkout }] = await Promise.all([
    getBag(),
    getNewArrivals(12),
    getSession(),
    searchParams,
  ]);
  const inBag = new Set(lines.map((line) => line.product.id));
  const recommended = arrivals.filter((product) => !inBag.has(product.id)).slice(0, 8);
  const soldOutCount = lines.filter((line) => line.status === "sold-out").length;
  const returned = typeof checkout === "string" && Object.hasOwn(checkoutNotices, checkout)
    ? checkoutNotices[checkout as keyof typeof checkoutNotices]
    : undefined;
  // Minutes left on the shopper's own unfinished checkout (opened in another tab, or left with Back).
  const heldMinutes = openCheckout?.minutesLeft ?? 0;

  return (
    <>
      <header className="container-page pt-12 pb-8 text-center md:pt-16 md:pb-12">
        <h1 className="font-display text-3xl md:text-4xl">Shopping bag</h1>
      </header>

      {returned && (
        <div className="container-page pb-8">
          <div
            role={checkout === "failed" ? "alert" : "status"}
            className={`mx-auto max-w-prose space-y-1 border px-4 py-3 text-center text-xs ${
              checkout === "failed" ? "border-danger" : "border-line-strong"
            }`}
          >
            <p className={`font-medium ${checkout === "failed" ? "text-danger" : ""}`}>{returned.title}</p>
            <p className="text-muted-foreground">{returned.body}</p>
          </div>
        </div>
      )}

      {lines.length === 0 ? (
        <section className="container-page pb-section">
          <div className="mx-auto max-w-prose space-y-6 border-y py-16 text-center">
            <p className="text-eyebrow">Your bag is empty</p>
            <p className="text-sm text-muted-foreground">
              Pieces you add will appear here. Discover the latest arrivals or continue exploring the collections.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/new" className="btn btn-primary">
                Shop new arrivals
              </Link>
              <Link href="/" className="btn btn-outline">
                Continue shopping
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="container-page grid gap-12 pb-section lg:grid-cols-[1fr_22rem] lg:gap-16 xl:grid-cols-[1fr_24rem]">
          <section aria-labelledby="selections-heading">
            <div className="flex items-baseline justify-between gap-4 border-b pb-4">
              <h2 id="selections-heading" className="text-title text-xs">
                Your selections
              </h2>
              <p className="text-2xs text-muted-foreground">{pieces(itemCount)}</p>
            </div>
            <ul>
              {lines.map((line) => (
                <BagLine key={line.product.id} line={line} />
              ))}
            </ul>
            <Link href="/new" className="link mt-8 inline-block text-xs">
              Continue shopping
            </Link>
          </section>

          <div className="space-y-6 lg:sticky lg:top-[calc(var(--spacing-header)+2rem)] lg:self-start">
            <section aria-labelledby="summary-heading" className="space-y-6 border p-6">
              <h2 id="summary-heading" className="text-title text-xs">
                Order summary
              </h2>
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between gap-4">
                  <dt>
                    Subtotal <span className="text-muted-foreground">({pieces(itemCount)})</span>
                  </dt>
                  <dd>{formatPrice(subtotalCents)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Shipping</dt>
                  <dd className="text-muted-foreground">Complimentary (express)</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t pt-4">
                  <dt className="font-medium tracking-eyebrow uppercase">Total</dt>
                  <dd className="text-lg">{formatPrice(subtotalCents)}</dd>
                </div>
              </dl>
              {soldOutCount > 0 && (
                <p className="text-2xs text-muted-foreground">
                  {soldOutCount === 1 ? "1 sold-out piece isn't" : `${soldOutCount} sold-out pieces aren't`} included in
                  your total.
                </p>
              )}
              {heldMinutes > 0 && !returned && (
                <p role="status" className="border border-line-strong px-3 py-2 text-2xs">
                  You have a checkout in progress. Your pieces are held for you for up to {heldMinutes}{" "}
                  {heldMinutes === 1 ? "minute" : "minutes"}; checking out again starts a new payment.
                </p>
              )}
              <CheckoutButton blocked={soldOutCount > 0} signedIn={session !== null} />
            </section>

            <section aria-labelledby="help-heading" className="border px-6">
              <h2 id="help-heading" className="text-title pt-6 pb-4 text-xs">
                May we help?
              </h2>
              <ul className="space-y-3 pb-6 text-xs">
                <li>
                  <Link href="/contact" className="link inline-flex items-center gap-2">
                    <PhoneIcon width={14} height={14} />
                    Contact a client advisor
                  </Link>
                </li>
                <li>
                  <Link href="/boutiques" className="link inline-flex items-center gap-2">
                    <PinIcon width={14} height={14} />
                    Find a boutique
                  </Link>
                </li>
              </ul>
              <details className="group border-t">
                <summary className={accordionSummary}>
                  Delivery &amp; returns
                  <ChevronDownIcon width={14} height={14} className="transition-transform group-open:rotate-180" />
                </summary>
                <ul className="space-y-4 pb-6 text-xs">
                  {services.map((service) => (
                    <li key={service.title}>
                      <p>{service.title}</p>
                      <p className="text-muted-foreground">{service.body}</p>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          </div>
        </div>
      )}

      {recommended.length > 0 && (
        <section aria-labelledby="recommended-heading" className="pb-section">
          <h2
            id="recommended-heading"
            className="text-title mb-8 px-gutter text-center text-xl md:mb-10 md:text-2xl"
          >
            You may also like
          </h2>
          <ProductRail products={recommended} label="Recommended products" />
        </section>
      )}
    </>
  );
}
