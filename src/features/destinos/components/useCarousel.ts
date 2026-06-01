"use client";

import * as React from "react";

/**
 * Mecánica compartida de los carruseles scroll-snap (hero de destacados y hero
 * de promos): dot activo sincronizado por IntersectionObserver, auto-advance
 * cada 6s con pausa al hover/touch, y scroll SOLO horizontal del track (nunca
 * mueve la página). Los slides deben tener `data-slide` y `data-idx={i}`.
 */
export function useCarousel(count: number) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const els = track.querySelectorAll<HTMLElement>("[data-slide]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.intersectionRatio > 0.6) {
            setActive(Number((e.target as HTMLElement).dataset.idx));
          }
        });
      },
      { root: track, threshold: [0.6] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [count]);

  const scrollToSlide = React.useCallback((idx: number) => {
    const track = trackRef.current;
    if (!track) return;
    const el = track.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    if (!el) return;
    const padLeft = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    track.scrollTo({ left: el.offsetLeft - padLeft, behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    if (paused || count <= 1) return;
    const id = setInterval(() => scrollToSlide((active + 1) % count), 6000);
    return () => clearInterval(id);
  }, [active, paused, count, scrollToSlide]);

  const trackProps = {
    ref: trackRef,
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onTouchStart: () => setPaused(true),
  };

  return { active, scrollToSlide, trackProps };
}
