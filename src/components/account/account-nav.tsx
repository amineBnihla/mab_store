"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";

const items = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/details", label: "Account details" },
];

/** Tabs on small screens (like the category nav), a sidebar list from `lg`. */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="-mx-gutter lg:mx-0">
      <ul className="scrollbar-none flex gap-6 overflow-x-auto px-gutter shadow-[inset_0_-1px_0_var(--line)] lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:shadow-none">
        {items.map((item) => {
          // Order detail pages keep "Orders" highlighted.
          const current = pathname === item.href || (item.href !== "/account" && pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`text-nav block border-b py-4 transition-colors lg:border-b-0 lg:border-l lg:py-2.5 lg:pl-4 ${
                  current
                    ? "border-line-strong"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="ml-auto shrink-0 lg:mt-6 lg:ml-0 lg:border-t lg:pt-6">
          <form action={signOut}>
            <button
              type="submit"
              className="text-nav block cursor-pointer border-b border-transparent py-4 text-muted-foreground transition-colors hover:text-foreground lg:border-b-0 lg:border-l lg:py-2.5 lg:pl-4"
            >
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
