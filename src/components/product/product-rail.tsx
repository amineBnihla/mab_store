import { ProductCard } from "@/components/product-card";
import { ScrollRail } from "@/components/scroll-rail";
import type { Product } from "@/lib/products";

/** Full-bleed product carousel: ~1.4 cards on phones up to ~4.5 on desktop. */
export function ProductRail({ products, label }: { products: Product[]; label: string }) {
  return (
    <ScrollRail
      label={label}
      controls
      className="scrollbar-none flex snap-x snap-mandatory gap-seam overflow-x-auto"
      indicatorClassName="mt-10 px-gutter md:mt-14"
    >
      {products.map((product) => (
        <div
          key={product.id}
          className="w-[72%] shrink-0 snap-start sm:w-[45%] md:w-[30%] lg:w-[22%]"
        >
          <ProductCard
            product={product}
            sizes="(min-width: 64rem) 22vw, (min-width: 48rem) 30vw, (min-width: 40rem) 45vw, 72vw"
          />
        </div>
      ))}
    </ScrollRail>
  );
}
