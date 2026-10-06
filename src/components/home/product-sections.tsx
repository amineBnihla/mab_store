import { SectionHeading } from "@/components/section-heading";
import { ProductCard } from "@/components/product-card";
import { getNewArrivals, getProductsByCategorySlugs } from "@/lib/products";

export async function NewArrivals() {
  const newArrivals = await getNewArrivals(8);
  return (
    <section className="section">
      <SectionHeading eyebrow="New In" title="This season's arrivals" href="/new" />
      <div className="grid-products">
        {newArrivals.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

/** Swipeable rail on small screens, four-up grid from tablet. */
export async function AccessoriesRail() {
  const accessories = await getProductsByCategorySlugs(["bags", "jewellery"], 4);
  return (
    <section className="section">
      <SectionHeading eyebrow="Accessories" title="Bags & jewellery" href="/accessories" />
      <div className="scrollbar-none flex snap-x snap-mandatory scroll-px-gutter gap-seam overflow-x-auto px-gutter md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {accessories.map((product) => (
          <div key={product.id} className="w-[72%] shrink-0 snap-start sm:w-[45%] md:w-auto">
            <ProductCard
              product={product}
              sizes="(min-width: 48rem) 25vw, (min-width: 40rem) 45vw, 72vw"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
