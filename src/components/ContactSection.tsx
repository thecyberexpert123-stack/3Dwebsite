"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { waLink, waMessages, PHONE_DISPLAY, PHONE_TEL } from "@/lib/whatsapp";
import { useInViewport, useWebGL } from "@/lib/hooks";
import { Reveal, TextReveal } from "./Reveal";
import { Magnetic } from "./Magnetic";
import {
  BowDoodle,
  FlowerDoodle,
  HeartDoodle,
  LeafDoodle,
  PhoneDoodle,
  WhatsAppGlyph,
} from "./Decorations";

const GiftScene = dynamic(() => import("./three/GiftScene"), { ssr: false });

/**
 * The closing page of the catalogue — "Let's Make Something Lovely."
 * with an interactive 3D gift that opens to release little hearts.
 */
export function ContactSection() {
  const [open, setOpen] = useState(false);
  const webgl = useWebGL();
  const sceneWrapRef = useRef<HTMLDivElement>(null);
  const near = useInViewport(sceneWrapRef, "300px");
  const has3D = webgl === true;

  return (
    <section id="contact" className="candy relative overflow-hidden py-24 md:py-32">
      {/* a few floating doodles — kept minimal */}
      <FlowerDoodle className="absolute left-[6%] top-16 h-12 w-12 -rotate-12 text-rose/40 animate-float" />
      <LeafDoodle className="absolute bottom-24 left-[12%] hidden h-14 w-14 rotate-12 text-sage-deep/40 animate-float-slow md:block" />
      <BowDoodle className="absolute right-[16%] top-20 hidden h-10 w-10 rotate-6 text-rose/40 md:block animate-float" />

      <div className="wrap relative grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
        {/* ---------- copy + CTAs ---------- */}
        <div className="flex flex-col items-start gap-7 text-left">
          <Reveal className="flex flex-col items-start gap-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-whitish/90 px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-rose shadow-clay-sm">
              <HeartDoodle className="h-3.5 w-3.5" /> say hello
            </p>
            <h2 className="max-w-xl text-balance font-script text-5xl leading-tight text-rose md:text-7xl">
              <TextReveal text="Let's Make Something Lovely." stagger={0.12} />
            </h2>
            <p className="max-w-md text-pretty text-lg leading-relaxed text-cocoa-soft md:text-xl">
              Have an idea, a gift in mind, or simply found something you love?
              We'd love to hear from you.
            </p>
          </Reveal>

          <Reveal delay={0.12} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Magnetic>
              <a href="#custom" className="btn btn-primary btn-lg min-w-52">
                Start an Order
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href={waLink(waMessages.general)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-lg min-w-52"
              >
                <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
                Chat on WhatsApp
              </a>
            </Magnetic>
          </Reveal>

          <Reveal delay={0.2} className="flex flex-col items-start gap-3">
            <a
              href={`tel:${PHONE_TEL}`}
              className="group flex items-center gap-2.5 rounded-full bg-white/60 px-5 py-2.5 font-semibold text-cocoa shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <PhoneDoodle className="h-4.5 w-4.5 text-rose transition-transform group-hover:rotate-12" />
              {PHONE_DISPLAY}
            </a>
            <p className="text-xs font-semibold text-cocoa-soft">
              WhatsApp enquiries are the fastest way to reach us
            </p>
          </Reveal>
        </div>

        {/* ---------- the little gift ---------- */}
        <Reveal delay={0.15} className="relative mx-auto w-full max-w-sm">
          <div
            aria-hidden="true"
            className="absolute inset-4 rounded-full bg-white/40 blur-2xl"
          />
          <div
            ref={sceneWrapRef}
            className="relative aspect-square w-full overflow-hidden rounded-[2.5rem]"
          >
            {has3D && near ? (
              <GiftScene open={open} onToggle={() => setOpen((o) => !o)} />
            ) : (
              <Image
                src="/images/products/gift-set.jpg"
                alt="A little gift box of hand-crocheted yarn pieces in cream tissue paper"
                fill
                sizes="(min-width: 1024px) 34vw, 92vw"
                className="object-cover"
              />
            )}
          </div>

          {has3D && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-pressed={open}
              className="btn btn-outline btn-sm absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white/85"
            >
              {open ? "close it up ✿" : "open your little gift ✿"}
            </button>
          )}
          {!has3D && (
            <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-hand text-lg text-rose">
              a little gift, whenever you're ready
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
