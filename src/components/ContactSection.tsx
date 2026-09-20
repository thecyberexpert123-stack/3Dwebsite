"use client";

import { waLink, waMessages, PHONE_DISPLAY, PHONE_TEL } from "@/lib/whatsapp";
import { Reveal } from "./Reveal";
import {
  BowDoodle,
  FlowerDoodle,
  HeartDoodle,
  LeafDoodle,
  PhoneDoodle,
  WhatsAppGlyph,
} from "./Decorations";

/**
 * The closing page of the catalogue — "Let's Make Something Lovely."
 * Primary CTA starts the custom-order flow; secondary opens WhatsApp.
 */
export function ContactSection() {
  return (
    <section id="contact" className="gingham-pink relative overflow-hidden py-24 md:py-32">
      {/* a few floating doodles — kept minimal */}
      <FlowerDoodle className="absolute left-[8%] top-16 h-12 w-12 -rotate-12 text-rose/40 animate-float" />
      <LeafDoodle className="absolute bottom-20 right-[10%] h-14 w-14 rotate-12 text-sage-deep/40 animate-float-slow" />
      <BowDoodle className="absolute right-[16%] top-20 hidden h-10 w-10 rotate-6 text-rose/40 md:block" />

      <div className="wrap relative flex flex-col items-center gap-8 text-center">
        <Reveal className="flex flex-col items-center gap-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-rose">
            <HeartDoodle className="h-3.5 w-3.5" /> say hello
          </p>
          <h2 className="max-w-3xl text-balance font-script text-5xl leading-tight text-cocoa md:text-7xl">
            Let's Make Something Lovely.
          </h2>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-cocoa-soft md:text-xl">
            Have an idea, a gift in mind, or simply found something you love?
            We'd love to hear from you.
          </p>
        </Reveal>

        <Reveal delay={0.12} className="flex flex-col items-center gap-4 sm:flex-row">
          <a href="#custom" className="btn btn-primary btn-lg min-w-52">
            Start an Order
          </a>
          <a
            href={waLink(waMessages.general)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-lg min-w-52"
          >
            <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
            Chat on WhatsApp
          </a>
        </Reveal>

        <Reveal delay={0.2}>
          <a
            href={`tel:${PHONE_TEL}`}
            className="group flex items-center gap-2.5 rounded-full bg-white/60 px-5 py-2.5 font-semibold text-cocoa shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            <PhoneDoodle className="h-4.5 w-4.5 text-rose transition-transform group-hover:rotate-12" />
            {PHONE_DISPLAY}
          </a>
          <p className="mt-3 text-xs font-semibold text-cocoa-soft">
            WhatsApp enquiries are the fastest way to reach us
          </p>
        </Reveal>
      </div>
    </section>
  );
}
