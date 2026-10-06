"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/icons";
import { SearchForm } from "@/components/search-form";
import { primaryNav } from "@/lib/catalog";
import { site } from "@/lib/site";

// Pages whose first section is a full-bleed image the header floats over.
const OVERLAY_ROUTES = new Set(["/"]);

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [panel, setPanel] = useState<"menu" | "search" | null>(null);
  const menuOpen = panel === "menu";
  const searchOpen = panel === "search";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    const root = document.documentElement;
    root.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  const transparent = OVERLAY_ROUTES.has(pathname) && !scrolled && !panel;
  const closePanel = () => setPanel(null);
  const toggle = (next: "menu" | "search") => setPanel((open) => (open === next ? null : next));
  const searchButtonProps = {
    type: "button" as const,
    "aria-label": searchOpen ? "Close search" : "Search",
    "aria-expanded": searchOpen,
    "aria-controls": "site-search",
    onClick: () => toggle("search"),
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        transparent
          ? "bg-transparent text-white"
          : "bg-background text-foreground shadow-[0_1px_0_var(--line)]"
      }`}
    >
      <div className="nav-bar">
        <div className="flex items-center">
          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {primaryNav.slice(0, 4).map((item) => (
              <Link key={item.href} href={item.href} className="text-nav link-quiet">
                {item.label}
              </Link>
            ))}
          </nav>
          <button {...searchButtonProps} className="btn-icon -ml-2.5 lg:hidden">
            {searchOpen ? <CloseIcon /> : <SearchIcon />}
          </button>
        </div>

        <Link href="/" className="text-wordmark" onClick={closePanel}>
          {site.name}
        </Link>

        <div className="flex items-center">
          <button {...searchButtonProps} className="btn-icon hidden lg:inline-flex">
            {searchOpen ? <CloseIcon /> : <SearchIcon />}
          </button>
          <Link href="/account" className="btn-icon hidden sm:inline-flex" aria-label="Account">
            <UserIcon />
          </Link>
          <Link href="/bag" className="btn-icon" aria-label="Shopping bag">
            <BagIcon />
          </Link>
          <button
            type="button"
            className="btn-icon -mr-2.5 w-auto gap-2 px-2.5 text-nav"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => toggle("menu")}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
            <span className="hidden md:inline">{menuOpen ? "Close" : "Menu"}</span>
            <span className="sr-only md:hidden">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div id="site-search" className="fixed inset-x-0 top-header bottom-0 flex flex-col">
          <div className="bg-background text-foreground shadow-[0_1px_0_var(--line)]">
            <div className="container-page max-w-prose py-8 md:py-12">
              <SearchForm autoFocus onSubmit={closePanel} />
            </div>
          </div>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="flex-1 cursor-default bg-overlay"
            onClick={closePanel}
          />
        </div>
      )}

      {menuOpen && (
        <div
          id="site-menu"
          className="fixed inset-x-0 top-header bottom-0 overflow-y-auto bg-background text-foreground"
        >
          <div className="container-page grid gap-12 py-10 md:grid-cols-[2fr_1fr] md:py-16">
            <nav aria-label="Menu">
              <ul className="space-y-3">
                {primaryNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closePanel}
                      className="link-quiet text-2xl md:text-3xl"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="space-y-8">
              <div>
                <p className="text-eyebrow mb-3">Services</p>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/contact" onClick={closePanel} className="link">Contact us</Link></li>
                  <li><Link href="/boutiques" onClick={closePanel} className="link">Book an appointment</Link></li>
                  <li><Link href="/account" onClick={closePanel} className="link">My account</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
