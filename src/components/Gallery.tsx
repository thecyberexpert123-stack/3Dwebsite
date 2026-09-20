"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { galleryFilters, galleryItems } from "@/data/gallery";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const ASPECTS: Record<string, string> = {
  tall: "aspect-[3/4]",
  square: "aspect-square",
  wide: "aspect-[4/3]",
};

/** Pinterest-style masonry gallery with filters and an accessible lightbox. */
export function Gallery() {
  const [filter, setFilter] = useState<string>("all");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const shown =
    filter === "all" ? galleryItems : galleryItems.filter((g) => g.category === filter);

  const openLightbox = (index: number) => setLightbox(index);
  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setLightbox((cur) => (cur === null ? null : (cur + dir + shown.length) % shown.length)),
    [shown.length]
  );

  // keyboard + scroll lock while the lightbox is open
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, close, step]);

  const current = lightbox !== null ? shown[lightbox] : null;

  return (
    <section id="gallery" className="polka relative py-20 md:py-28">
      <div className="wrap">
        <SectionHeading
          eyebrow="a peek inside"
          title="The Little Things"
          accent="Gallery"
          lead="Pieces, works-in-progress and little corners of the studio — tap any photo to look closer."
        />

        {/* filters */}
        <Reveal delay={0.1} className="mt-10 flex flex-wrap justify-center gap-2.5">
          {galleryFilters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFilter(f.id);
                  setLightbox(null);
                }}
                aria-pressed={active}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                  active
                    ? "border-rose bg-blush text-cocoa shadow-soft"
                    : "border-rose/30 bg-white/70 text-cocoa-soft hover:border-rose/60 hover:text-rose"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </Reveal>

        {/* masonry */}
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 columns-2 gap-4 md:columns-3 md:gap-5"
        >
          {shown.map((item, i) => (
            <motion.figure
              key={item.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3) }}
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[1.5rem] shadow-card transition-all duration-500 hover:-translate-y-1 hover:rotate-[0.5deg] hover:shadow-lift md:mb-5"
              style={{ rotate: `${((i % 3) - 1) * 0.4}deg` }}
            >
              <button
                type="button"
                onClick={() => openLightbox(i)}
                className="block w-full cursor-zoom-in"
                aria-label={`Open photo: ${item.alt}`}
              >
                <span className={`relative block ${ASPECTS[item.aspect]} w-full`}>
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
                  />
                </span>
                <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-cocoa/60 to-transparent p-3.5 pt-8 font-hand text-lg text-white transition-transform duration-400 group-hover:translate-y-0">
                  {item.caption}
                </span>
              </button>
            </motion.figure>
          ))}
        </motion.div>
      </div>

      {/* ---------- lightbox ---------- */}
      <AnimatePresence>
        {current && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Photo: ${current.caption}`}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              type="button"
              aria-label="Close photo viewer"
              onClick={close}
              className="absolute inset-0 bg-bark/60 backdrop-blur-sm"
            />

            <motion.figure
              key={current.id}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex max-h-full flex-col items-center"
            >
              <div className="relative max-h-[74vh] w-[min(90vw,56rem)] overflow-hidden rounded-[1.5rem] shadow-lift">
                <Image
                  src={current.src}
                  alt={current.alt}
                  width={1000}
                  height={768}
                  className="h-auto max-h-[74vh] w-full object-contain"
                  priority
                />
              </div>
              <figcaption className="mt-4 flex items-center gap-3 font-hand text-xl text-ivory">
                {current.caption}
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-body font-bold tracking-widest text-ivory/80">
                  {lightbox! + 1} / {shown.length}
                </span>
              </figcaption>
            </motion.figure>

            {/* controls */}
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-cocoa shadow-soft transition-transform hover:scale-105"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-cocoa shadow-soft transition-transform hover:scale-105 md:left-6"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-cocoa shadow-soft transition-transform hover:scale-105 md:right-6"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
