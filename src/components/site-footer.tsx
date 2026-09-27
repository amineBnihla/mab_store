import Link from "next/link";

import { NewsletterForm } from "@/components/newsletter-form";
import { site } from "@/lib/site";

const columns = [
  {
    title: "Client services",
    links: [
      { label: "Contact us", href: "/contact" },
      { label: "My order", href: "/account/orders" },
      { label: "Shipping", href: "/help/shipping" },
      { label: "Returns", href: "/help/returns" },
      { label: "FAQs", href: "/help" },
    ],
  },
  {
    title: "The house",
    links: [
      { label: "About us", href: "/about" },
      { label: "Sustainability", href: "/sustainability" },
      { label: "Careers", href: "/careers" },
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of sale", href: "/legal/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="surface-inverse">
      <div className="container-page grid gap-12 pt-section pb-12 md:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-eyebrow mb-5">{column.title}</h2>
            <ul className="space-y-3 text-xs">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="space-y-10 md:col-span-2">
          <div className="max-w-form">
            <h2 className="text-eyebrow mb-3">Newsletter</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Be the first to hear about new collections, private sales and
              events.
            </p>
            <NewsletterForm />
          </div>
          <div>
            <h2 className="text-eyebrow mb-3">Country / Region</h2>
            <Link href="/locale" className="link text-xs">
              Ireland (€ EUR)
            </Link>
          </div>
        </div>
      </div>

      <div className="container-page flex flex-col gap-2 pb-10 text-2xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
        <p>Sample storefront — imagery via Unsplash.</p>
      </div>

      <p
        aria-hidden
        className="text-display overflow-hidden px-gutter pb-6 text-center leading-none select-none"
      >
        {site.name}
      </p>
    </footer>
  );
}
