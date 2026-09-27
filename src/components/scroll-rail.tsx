"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { ChevronRightIcon } from "@/components/icons";

type ScrollRailProps = {
  children: ReactNode;
  /** Accessible name for the scroll region. */
  label: string;
  /** Classes for the scrolling track (layout, snap, gaps). */
  className?: string;
  /** Classes for the progress row under the track (spacing, breakpoint visibility). */
  indicatorClassName?: string;
  /** Show previous/next buttons beside the progress bar from desktop up. */
  controls?: boolean;
};

/** Horizontal scroller with a hairline progress bar that tracks the visible window. */
export function ScrollRail({
  children,
  label,
  className = "",
  indicatorClassName = "",
  controls = false,
}: ScrollRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ start: 0, size: 1 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = track;
      setView({ start: scrollLeft / scrollWidth, size: clientWidth / scrollWidth });
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const scrollable = view.size < 0.99;

  const page = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <div>
      <div ref={trackRef} role="region" aria-label={label} tabIndex={0} className={className}>
        {children}
      </div>

      {/* Kept in the layout while measuring so the page doesn't shift. */}
      <div
        aria-hidden={!scrollable}
        className={`flex items-center justify-center gap-4 ${scrollable ? "" : "invisible"} ${indicatorClassName}`}
      >
        {controls && (
          <button
            type="button"
            className="btn-icon hidden rotate-180 disabled:opacity-30 lg:inline-flex"
            aria-label="Previous"
            disabled={view.start <= 0.001}
            onClick={() => page(-1)}
          >
            <ChevronRightIcon width={16} height={16} />
          </button>
        )}
        <div className="relative h-px w-full max-w-40 bg-line">
          <div
            className="absolute -top-px h-[3px] bg-foreground transition-[left] duration-150"
            style={{ left: `${view.start * 100}%`, width: `${view.size * 100}%` }}
          />
        </div>
        {controls && (
          <button
            type="button"
            className="btn-icon hidden disabled:opacity-30 lg:inline-flex"
            aria-label="Next"
            disabled={view.start + view.size >= 0.999}
            onClick={() => page(1)}
          >
            <ChevronRightIcon width={16} height={16} />
          </button>
        )}
      </div>
    </div>
  );
}
