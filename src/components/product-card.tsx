import Image from "next/image";
import Link from "next/link";

import { HeartIcon } from "@/components/icons";
import { formatPrice } from "@/lib/catalog";
import type { Product } from "@/lib/products";

type ProductCardProps = {
  product: Product;
  sizes?: string;
};

export function ProductCard({
  product,
  sizes = "(min-width: 48rem) 25vw, 50vw",
}: ProductCardProps) {
  return (
    <article className="group relative">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="media-frame aspect-product">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes={sizes}
            className="transition-transform duration-700 ease-standard group-hover:scale-[1.03]"
          />
        </div>
        <div className="space-y-0.5 px-3 pt-3 md:px-4">
          <h3 className="text-xs">{product.name}</h3>
          <p className="text-xs text-muted-foreground">{formatPrice(product.priceCents)}</p>
        </div>
      </Link>

      {product.badge && (
        <span className="absolute top-3 left-3 text-2xs font-medium tracking-eyebrow uppercase md:left-4">
          {product.badge}
        </span>
      )}
      <button
        type="button"
        className="btn-icon absolute top-1 right-1"
        aria-label={`Save ${product.name} to wishlist`}
      >
        <HeartIcon width={16} height={16} />
      </button>
    </article>
  );
}
