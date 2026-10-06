/**
 * Idempotent catalog seed: `npm run db:seed`.
 *
 * Upserts on `slug`, so re-running updates rows instead of duplicating them.
 * Builds its own client instead of importing `@/db` so env loading happens
 * before anything reads DATABASE_URL (and BETTER_AUTH_SECRET isn't required).
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { unsplash } from "../lib/catalog";
import { categories, products } from "./catalog-schema";

// Same precedence as Next.js and drizzle.config.ts.
config({ path: [".env.local", ".env"], quiet: true });

const categorySeed = [
  { slug: "ready-to-wear", name: "Ready-to-wear" },
  { slug: "knitwear", name: "Knitwear" },
  { slug: "tailoring", name: "Tailoring" },
  { slug: "shoes", name: "Shoes" },
  { slug: "bags", name: "Bags" },
  { slug: "jewellery", name: "Jewellery" },
];

type ProductSeed = {
  slug: string;
  name: string;
  category: string;
  /** Whole euros; converted to cents on insert. */
  price: number;
  image: string;
  badge?: string;
  stock: number;
  description: string;
  details: string[];
};

// Listed newest first: "New In" shows the first eight.
const productSeed: ProductSeed[] = [
  {
    slug: "leather-biker-jacket",
    name: "Leather biker jacket",
    category: "ready-to-wear",
    price: 3200,
    image: unsplash("1551028719-00167b16eac5"),
    badge: "New",
    stock: 6,
    description:
      "A classic biker cut in supple lambskin, softened with a vegetable-tanned finish that deepens with wear. Asymmetric zip front, snap-down lapels and a slightly cropped length.",
    details: ["100% lambskin leather", "Cupro lining", "Antique-brass hardware", "Made in Italy"],
  },
  {
    slug: "satin-bomber-jacket",
    name: "Satin bomber jacket",
    category: "ready-to-wear",
    price: 1850,
    image: unsplash("1591047139829-d91aecb6caea"),
    stock: 2,
    description:
      "A lightly padded bomber in liquid duchess satin, with ribbed knit trims at the collar, cuffs and hem. Relaxed through the body for easy layering.",
    details: ["100% silk satin", "Wool-blend rib trims", "Two welt pockets", "Made in Italy"],
  },
  {
    slug: "pleated-silk-trousers",
    name: "Pleated silk trousers",
    category: "ready-to-wear",
    price: 1150,
    image: unsplash("1594633312681-425c7b97ccd1"),
    badge: "New",
    stock: 9,
    description:
      "High-rise trousers with deep front pleats and a fluid wide leg that falls to the floor. Cut from a heavy silk crêpe that moves with every step.",
    details: ["100% silk crêpe", "Concealed hook-and-bar fastening", "Side seam pockets", "Made in France"],
  },
  {
    slug: "crochet-cotton-poncho",
    name: "Crochet cotton poncho",
    category: "knitwear",
    price: 980,
    image: unsplash("1434389677669-e08b4cac3105"),
    stock: 0,
    description:
      "Hand-crocheted in an open stitch from organic cotton, finished with a fringed hem. Drapes loosely over the shoulders for an effortless layer.",
    details: ["100% organic cotton", "Hand-crocheted", "One size", "Made in Portugal"],
  },
  {
    slug: "wool-single-breasted-suit",
    name: "Wool single-breasted suit",
    category: "tailoring",
    price: 3900,
    image: unsplash("1507679799987-c73779587ccf"),
    stock: 4,
    description:
      "A two-button suit in fine Super 120s wool, softly structured through the shoulder with a half-canvas construction. Trousers are flat-fronted with a tapered leg.",
    details: ["100% virgin wool", "Half-canvas construction", "Horn buttons", "Made in Italy"],
  },
  {
    slug: "printed-stiletto-pump",
    name: "Printed stiletto pump",
    category: "shoes",
    price: 890,
    image: unsplash("1543163521-1bf539c55dd2"),
    badge: "Exclusive",
    stock: 3,
    description:
      "A pointed-toe pump on a slender 100mm heel, in calfskin printed with an archival motif. Leather-lined and padded at the footbed for comfort.",
    details: ["Printed calfskin upper", "Leather lining and sole", "100mm heel", "Made in Italy"],
  },
  {
    slug: "leather-derby-shoe",
    name: "Leather derby shoe",
    category: "shoes",
    price: 850,
    image: unsplash("1614252235316-8c857d38b5f4"),
    stock: 12,
    description:
      "An open-laced derby in polished calf leather, Goodyear-welted onto a leather sole for a shoe that can be resoled for years to come.",
    details: ["Polished calf leather", "Goodyear-welted leather sole", "Waxed cotton laces", "Made in England"],
  },
  {
    slug: "panelled-runner-sneaker",
    name: "Panelled runner sneaker",
    category: "shoes",
    price: 790,
    image: unsplash("1560769629-975ec94e6a86"),
    stock: 15,
    description:
      "A retro-inspired runner panelled in suede, nappa and technical mesh, set on a lightweight cushioned sole.",
    details: ["Suede, nappa and mesh upper", "Rubber outsole", "Removable leather insole", "Made in Italy"],
  },
  {
    slug: "top-handle-bag",
    name: "Top handle bag",
    category: "bags",
    price: 2950,
    image: unsplash("1584917865442-de89df76afd3"),
    stock: 5,
    description:
      "A structured top handle bag in grained calfskin, with a detachable shoulder strap and a turn-lock closure. Sized to carry the essentials.",
    details: ["Grained calfskin", "Suede lining", "Detachable shoulder strap", "Made in France"],
  },
  {
    slug: "chain-shoulder-bag",
    name: "Chain shoulder bag",
    category: "bags",
    price: 2400,
    image: unsplash("1566150905458-1bf1fc113f0d"),
    badge: "New",
    stock: 1,
    description:
      "A soft quilted shoulder bag on a sliding chain strap that can be worn doubled or long. Magnetic flap closure with an interior zip pocket.",
    details: ["Quilted lambskin", "Gold-tone chain strap", "Interior zip pocket", "Made in Italy"],
  },
  {
    slug: "crystal-drop-earrings",
    name: "Crystal drop earrings",
    category: "jewellery",
    price: 650,
    image: unsplash("1535632066927-ab7c9ab60908"),
    stock: 0,
    description:
      "Articulated drop earrings set with hand-cut crystals that catch the light with every movement. Finished with secure post-and-butterfly backs.",
    details: ["Gold-plated brass", "Hand-cut crystals", "Post-and-butterfly backs", "Made in Austria"],
  },
  {
    slug: "fine-chain-necklace",
    name: "Fine chain necklace",
    category: "jewellery",
    price: 480,
    image: unsplash("1611085583191-a3b181a88401"),
    stock: 20,
    description:
      "A delicate cable chain in solid sterling silver, adjustable between two lengths to wear alone or layered.",
    details: ["925 sterling silver", "Adjustable 40–45cm", "Lobster clasp", "Made in Italy"],
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (checked .env.local and .env).");
  const db = drizzle({ client: neon(url) });

  const categoryRows = await db
    .insert(categories)
    .values(categorySeed)
    .onConflictDoUpdate({ target: categories.slug, set: { name: sql`excluded.name` } })
    .returning({ id: categories.id, slug: categories.slug });
  const categoryIds = new Map(categoryRows.map((row) => [row.slug, row.id]));

  // One minute apart, newest first, so ordering by created_at matches the list.
  const now = Date.now();
  const rows = productSeed.map((p, i) => {
    const categoryId = categoryIds.get(p.category);
    if (!categoryId) throw new Error(`Unknown category "${p.category}" for ${p.slug}`);
    return {
      slug: p.slug,
      name: p.name,
      description: p.description,
      details: p.details,
      priceCents: p.price * 100,
      imageUrl: p.image,
      badge: p.badge ?? null,
      stockQuantity: p.stock,
      categoryId,
      createdAt: new Date(now - i * 60_000),
    };
  });

  await db
    .insert(products)
    .values(rows)
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        details: sql`excluded.details`,
        priceCents: sql`excluded.price_cents`,
        imageUrl: sql`excluded.image_url`,
        badge: sql`excluded.badge`,
        stockQuantity: sql`excluded.stock_quantity`,
        categoryId: sql`excluded.category_id`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`now()`,
      },
    });

  console.log(`Seeded ${categoryRows.length} categories and ${rows.length} products.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
