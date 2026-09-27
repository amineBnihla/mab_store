// Storefront editorial content and presentation helpers. Product data lives in
// the database — see src/lib/products.ts.

export type Collection = {
  title: string;
  href: string;
  image: string;
};

/** Unsplash image URL capped at `width` so the optimizer never fetches originals. */
export function unsplash(photoId: string, width = 1600) {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

export const hero = {
  eyebrow: "Autumn–Winter 2026",
  title: "The Quiet Season",
  image: unsplash("1502716119720-b23a93e5fe1b", 2400),
  imageAlt: "Model in a red polka-dot dress walking through a dry meadow",
  links: [
    { label: "Shop Women", href: "/women" },
    { label: "Shop Men", href: "/men" },
  ],
};

export const collections: Collection[] = [
  {
    title: "Women",
    href: "/women",
    image: unsplash("1554412933-514a83d2f3c8", 1200),
  },
  {
    title: "Men",
    href: "/men",
    image: unsplash("1617137968427-85924c800a22", 1200),
  },
  {
    title: "Bags",
    href: "/bags",
    image: unsplash("1590874103328-eac38a683ce7", 1200),
  },
];

export type StockState = "in-stock" | "low-stock" | "out-of-stock";

/** Quantities at or below this read as "Only N left". */
export const LOW_STOCK_THRESHOLD = 3;

export function getStockState(stock: number): StockState {
  if (stock <= 0) return "out-of-stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}

export const editorial = {
  eyebrow: "The Knitwear Edit",
  title: "Softness, considered",
  body: "Hand-finished cashmere, brushed mohair and open-stitch cotton in a palette drawn from winter fields. Pieces made to be layered, lived in and kept.",
  cta: { label: "Discover knitwear", href: "/women/knitwear" },
  image: unsplash("1558769132-cb1aea458c5e", 1600),
  imageAlt: "Neutral knitwear hanging on a rail beside dried pampas grass",
  secondaryImage: unsplash("1581044777550-4cfa60707c03", 1000),
  secondaryImageAlt: "Model in a pink ruffled blouse standing in a golden field",
};

export const feature = {
  eyebrow: "Boutiques",
  title: "Book a private appointment",
  cta: { label: "Find a boutique", href: "/boutiques" },
  image: unsplash("1445205170230-053b83016050", 2400),
  imageAlt: "Warmly lit boutique interior with rails of neutral garments",
};

export const services = [
  {
    title: "Complimentary shipping",
    body: "Free express delivery on every order, packaged in our signature box.",
  },
  {
    title: "Returns within 30 days",
    body: "Return or exchange any item online or in boutique, free of charge.",
  },
  {
    title: "Client advisors",
    body: "Personal styling and product advice by phone, chat or video call.",
  },
];

export const primaryNav = [
  { label: "New In", href: "/new" },
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Bags", href: "/bags" },
  { label: "Shoes", href: "/shoes" },
  { label: "Jewellery", href: "/jewellery" },
  { label: "Gifts", href: "/gifts" },
];

/** Formats a price in euro cents; whole euros show no decimals. */
export function formatPrice(cents: number) {
  const fractionDigits = cents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}
