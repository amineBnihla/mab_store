import Image from "next/image";
import Link from "next/link";

import { feature } from "@/lib/catalog";

export function FeatureBanner() {
  return (
    <section className="media-frame media-scrim surface-inverse h-[80svh] min-h-[30rem]">
      <Image src={feature.image} alt={feature.imageAlt} fill sizes="100vw" />
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-gutter pb-12 text-center md:pb-16">
        <p className="text-2xs font-medium tracking-eyebrow uppercase">{feature.eyebrow}</p>
        <h2 className="font-display text-3xl md:text-4xl">{feature.title}</h2>
        <Link href={feature.cta.href} className="btn btn-text">
          {feature.cta.label}
        </Link>
      </div>
    </section>
  );
}
