import Image from "next/image";
import Link from "next/link";

import { editorial } from "@/lib/catalog";

export function EditorialSplit() {
  return (
    <section className="grid gap-seam md:grid-cols-2">
      <div className="media-frame aspect-[4/5] md:aspect-auto md:min-h-[44rem]">
        <Image src={editorial.image} alt={editorial.imageAlt} fill sizes="(min-width: 48rem) 50vw, 100vw" />
      </div>

      <div className="flex flex-col items-center justify-center gap-10 bg-muted px-gutter py-section text-center">
        <div className="media-frame aspect-product w-44 md:w-56">
          <Image
            src={editorial.secondaryImage}
            alt={editorial.secondaryImageAlt}
            fill
            sizes="14rem"
          />
        </div>
        <div className="max-w-prose space-y-4">
          <p className="text-eyebrow">{editorial.eyebrow}</p>
          <h2 className="font-display text-3xl md:text-4xl">{editorial.title}</h2>
          <p className="text-muted-foreground">{editorial.body}</p>
        </div>
        <Link href={editorial.cta.href} className="btn btn-outline">
          {editorial.cta.label}
        </Link>
      </div>
    </section>
  );
}
