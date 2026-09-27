import Image from "next/image";
import Link from "next/link";

import { collections } from "@/lib/catalog";

export function CollectionPanels() {
  return (
    <section aria-label="Shop by collection" className="grid gap-seam pt-seam md:grid-cols-3">
      {collections.map((collection) => (
        <Link
          key={collection.href}
          href={collection.href}
          className="group media-frame media-scrim block surface-inverse aspect-[4/5] md:aspect-editorial"
        >
          <Image
            src={collection.image}
            alt=""
            fill
            sizes="(min-width: 48rem) 33vw, 100vw"
            className="transition-transform duration-1000 ease-standard group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1 pb-8 text-center">
            <h2 className="text-nav">{collection.title}</h2>
            <span className="text-xs underline underline-offset-[0.3em] decoration-1 transition-colors group-hover:decoration-transparent">
              Shop now
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
