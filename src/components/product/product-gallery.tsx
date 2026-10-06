import Image from "next/image";

import { ScrollRail } from "@/components/scroll-rail";

type ProductGalleryProps = {
  images: string[];
  alt: string;
};

/** Full-bleed imagery: swipeable single frames on mobile, side-by-side frames from tablet. */
export function ProductGallery({ images, alt }: ProductGalleryProps) {
  return (
    <ScrollRail
      label={`${alt} images`}
      className="scrollbar-none flex snap-x snap-mandatory gap-seam overflow-x-auto md:grid md:grid-cols-2 md:overflow-visible"
      indicatorClassName="mt-4 md:hidden"
    >
      {images.map((src, index) => (
        <div
          key={src}
          className="media-frame aspect-[4/5] w-full shrink-0 snap-start md:aspect-[7/6]"
        >
          <Image
            src={src}
            alt={index === 0 ? alt : `${alt}, detail ${index}`}
            fill
            preload={index === 0}
            sizes="(min-width: 48rem) 50vw, 100vw"
          />
        </div>
      ))}
    </ScrollRail>
  );
}
