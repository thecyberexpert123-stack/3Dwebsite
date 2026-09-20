"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useWebGL } from "@/lib/hooks";
import { waLink, waMessages } from "@/lib/whatsapp";
import { Reveal } from "./Reveal";
import { FlowerDoodle, HeartDoodle, WhatsAppGlyph } from "./Decorations";

const CustomFlowerScene = dynamic(() => import("./three/CustomFlowerScene"), {
  ssr: false,
  loading: () => <FlowerFallback />,
});

const COLOURS = [
  { id: "pink", label: "Pink", hex: "#F2B9C9" },
  { id: "cream", label: "Cream", hex: "#F6E9D8" },
  { id: "red", label: "Red", hex: "#D96A6A" },
  { id: "lavender", label: "Lavender", hex: "#CBB6EA" },
  { id: "sage", label: "Sage", hex: "#A9BFA3" },
] as const;

function FlowerFallback() {
  return (
    <div className="relative h-full w-full">
      <Image
        src="/images/products/sunflower.jpg"
        alt="A hand-crocheted flower in warm golden yellow"
        fill
        sizes="(min-width: 1024px) 42vw, 92vw"
        className="object-cover"
      />
    </div>
  );
}

/**
 * "Imagine it your way." — an interactive demonstration of customization:
 * tap a colour and the 3D blossom drifts to it. Choosing a colour also
 * primes a WhatsApp enquiry in that shade.
 */
export function ColorCustomizer() {
  const [colourId, setColourId] = useState<string>(COLOURS[0].id);
  const [customHex, setCustomHex] = useState("#E8B4C8");
  const webgl = useWebGL();

  const isCustom = colourId === "custom";
  const active = COLOURS.find((c) => c.id === colourId) ?? COLOURS[0];
  const activeHex = isCustom ? customHex : active.hex;
  const activeLabel = isCustom ? `a custom colour (${customHex})` : active.label;

  return (
    <section id="imagine" className="gingham-pink relative overflow-hidden py-20 md:py-28">
      <div className="wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* the blossom */}
        <Reveal className="relative order-2 mx-auto aspect-square w-full max-w-md lg:order-1">
          <div className="absolute inset-0 rounded-full bg-white/40 blur-2xl" aria-hidden="true" />
          <div className="relative h-full w-full">
            {webgl === false ? <FlowerFallback /> : <CustomFlowerScene color={activeHex} fallback={<FlowerFallback />} />}
          </div>
          <p className="pointer-events-none absolute -left-2 top-6 -rotate-6 font-hand text-xl text-rose/90">
            pick a colour →
          </p>
          <FlowerDoodle className="absolute -right-2 bottom-8 h-9 w-9 rotate-12 text-rose/60 animate-sway" />
        </Reveal>

        {/* controls */}
        <Reveal delay={0.1} className="order-1 flex flex-col items-start gap-6 lg:order-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-rose">
            <FlowerDoodle className="h-4 w-4" /> try the customizer
          </p>
          <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-cocoa md:text-5xl">
            Imagine it <span className="font-script font-normal text-rose">your way.</span>
          </h2>
          <p className="max-w-md text-pretty text-lg leading-relaxed text-cocoa-soft">
            Every Whimlet piece can be made in colours you love. Tap a shade and
            watch the blossom change — then tell us your favourite and we'll
            crochet it that way.
          </p>

          {/* colour swatches */}
          <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Choose a colour">
            {COLOURS.map((c) => {
              const isActive = colourId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColourId(c.id)}
                  aria-pressed={isActive}
                  aria-label={c.label}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isActive ? "scale-110 border-cocoa shadow-soft" : "border-white/80 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {isActive && (
                    <HeartDoodle className={c.id === "cream" || c.id === "sage" ? "h-5 w-5 text-cocoa" : "h-5 w-5 text-white"} />
                  )}
                </button>
              );
            })}

            {/* custom picker */}
            <label
              className={`relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-300 ${
                isCustom ? "scale-110 border-cocoa shadow-soft" : "border-white/80 hover:scale-105"
              }`}
              style={{
                background: `conic-gradient(${customHex} 0 25%, #F2B9C9 0 50%, #A9BFA3 0 75%, #CBB6EA 0)`,
              }}
              title="Pick your own colour"
            >
              <span className="font-hand text-[0.65rem] font-bold uppercase tracking-wide text-cocoa drop-shadow-sm">
                custom
              </span>
              <input
                type="color"
                value={customHex}
                onChange={(e) => {
                  setCustomHex(e.target.value);
                  setColourId("custom");
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Pick a custom colour"
              />
            </label>
          </div>

          <p className="font-hand text-xl text-rose">
            currently imagining: <span className="font-bold">{isCustom ? customHex : active.label.toLowerCase()}</span>
          </p>

          <a
            href={waLink(waMessages.colourCustom(activeLabel))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-lg"
          >
            <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
            Enquire in This Colour
          </a>
        </Reveal>
      </div>
    </section>
  );
}
