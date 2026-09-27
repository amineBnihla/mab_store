import Link from "next/link";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
};

export function SectionHeading({ eyebrow, title, href, linkLabel = "View all" }: SectionHeadingProps) {
  return (
    <div className="container-page mb-8 flex items-end justify-between gap-6 md:mb-10">
      <div>
        <p className="text-eyebrow mb-2">{eyebrow}</p>
        <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="link shrink-0 text-xs">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
