import Image from "next/image";
import Link from "next/link";

import { hero } from "@/lib/catalog";

export function Hero() {
  return (
    // Pulled up under the sticky header so the image runs edge to edge.
    <section className="media-frame media-scrim media-scrim-top surface-inverse -mt-header h-svh min-h-[34rem]">
      <Image
        src={hero.image}
        alt={hero.imageAlt}
        fill
        preload
        sizes="100vw"
        className="object-[70%_center] sm:object-center"
      />
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 px-gutter pb-12 text-center md:pb-16">
        <p className="text-2xs font-medium tracking-eyebrow uppercase">{hero.eyebrow}</p>
        <h1 className="font-display text-4xl sm:text-5xl sm:leading-none lg:text-[4.5rem]">
          {hero.title}
        </h1>
        <div className="mt-1 flex gap-8">
          {hero.links.map((link) => (
            <Link key={link.href} href={link.href} className="btn btn-text">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
