"use client";

import { useState } from "react";
import { faqs } from "@/data/faqs";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { FlowerDoodle } from "./Decorations";

/** Animated accordion — CSS grid-rows height animation, one open at a time. */
export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="polka relative py-20 md:py-28">
      <div className="wrap">
        <SectionHeading
          eyebrow="good questions"
          title="Little"
          accent="FAQs"
          lead="Everything people usually ask before ordering something handmade."
        />

        <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-3.5">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={faq.q} delay={Math.min(i * 0.05, 0.25)}>
                <div className="card overflow-hidden transition-shadow duration-400 hover:shadow-soft">
                  <h3>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-bold text-cocoa transition-colors hover:text-rose-ink md:px-7"
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      id={`faq-button-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span className="flex items-center gap-3">
                        <FlowerDoodle className={`hidden h-5 w-5 shrink-0 transition-colors sm:block ${isOpen ? "text-rose-ink" : "text-blush-deep"}`} />
                        {faq.q}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold transition-all duration-400 ${
                          isOpen ? "rotate-45 border-rose bg-blush text-cocoa" : "border-blush-deep/40 text-rose-ink"
                        }`}
                      >
                        +
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-button-${i}`}
                    data-open={isOpen}
                    className="acc-panel"
                  >
                    <div>
                      <p className="px-6 pb-6 text-pretty leading-relaxed text-cocoa-soft md:px-7 md:pl-[4.4rem]">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
