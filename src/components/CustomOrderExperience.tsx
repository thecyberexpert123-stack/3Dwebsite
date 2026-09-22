"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  buildCustomMessage,
  waLink,
  waMessages,
  type CustomEnquiry,
} from "@/lib/whatsapp";
import { useInViewport, useIsMobile, useWebGL } from "@/lib/hooks";
import { Reveal } from "./Reveal";
import {
  BowDoodle,
  FlowerDoodle,
  GiftDoodle,
  HeartDoodle,
  LeafDoodle,
  SparkleDoodle,
  StitchDoodle,
  WhatsAppGlyph,
  YarnDoodle,
} from "./Decorations";
import dynamic from "next/dynamic";
import Image from "next/image";
import { withBasePath } from "@/lib/paths";

/* The "customization desk" — a gentle 3D still life (desktop, WebGL only).
   On mobile or without WebGL, a lovely static image takes its place. */
const DeskScene = dynamic(() => import("./three/DeskScene"), { ssr: false });

const TYPES = [
  { id: "Flowers", label: "Flowers", icon: FlowerDoodle },
  { id: "Bouquet", label: "Bouquet", icon: BowDoodle },
  { id: "Keychain", label: "Keychain", icon: HeartDoodle },
  { id: "Charm", label: "Charm", icon: SparkleDoodle },
  { id: "Accessory", label: "Accessory", icon: LeafDoodle },
  { id: "Bandana", label: "Bandana", icon: StitchDoodle },
  { id: "Other", label: "Other", icon: YarnDoodle },
] as const;

const VIBES = [
  "Pastel Pink",
  "Blush & Cream",
  "Bright & Cheerful",
  "Earthy & Warm",
  "Sage & Natural",
  "Lavender Dream",
  "Surprise Me!",
] as const;

const STEP_LABELS = ["Type", "Vibe", "Idea", "Extra", "You", "Review"] as const;

type Form = CustomEnquiry & { sent: boolean };

const initialForm: Form = {
  type: "",
  vibes: [],
  idea: "",
  extra: "",
  name: "",
  phone: "",
  email: "",
  sent: false,
};

export function CustomOrderExperience() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(initialForm);
  const [error, setError] = useState("");
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();
  const webgl = useWebGL();
  const deskWrapRef = useRef<HTMLDivElement>(null);
  const deskNear = useInViewport(deskWrapRef, "200px");

  const showDesk3D = webgl === true && !isMobile;

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleVibe = (vibe: string) =>
    setForm((f) => ({
      ...f,
      vibes: f.vibes.includes(vibe) ? f.vibes.filter((v) => v !== vibe) : [...f.vibes, vibe],
    }));

  const validate = (): boolean => {
    setError("");
    if (step === 0 && !form.type) {
      setError("Pick what you're looking for — or choose “Other”.");
      return false;
    }
    if (step === 2 && form.idea.trim().length < 4) {
      setError("Tell us a little about your idea — even a few words help.");
      return false;
    }
    if (step === 4) {
      if (!form.name.trim()) {
        setError("We'd love a name to greet you by.");
        return false;
      }
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        setError("That email doesn't look quite right — mind checking it?");
        return false;
      }
      if (form.phone && !/^[+\d][\d\s-]{6,14}$/.test(form.phone.trim())) {
        setError("That phone number doesn't look quite right — mind checking it?");
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validate()) return;
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  };
  const back = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const message = useMemo(() => buildCustomMessage(form), [form]);

  return (
    <section id="custom" className="surface-mint relative overflow-hidden py-20 md:py-28">
      <YarnDoodle className="absolute -left-8 top-16 h-36 w-36 -rotate-12 text-blush/40" />
      <div className="wrap grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        {/* ---------- left: pitch + desk visual ---------- */}
        <Reveal className="flex flex-col items-start gap-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-rose-ink">
            <SparkleDoodle className="h-4 w-4" /> custom orders, the heart of it all
          </p>
          <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-cocoa md:text-5xl">
            Dream It.
            <span className="block font-script font-normal text-rose-ink">We'll Crochet It.</span>
          </h2>
          <p className="max-w-md text-pretty text-lg leading-relaxed text-cocoa-soft">
            Have something specific in mind? Tell us what you're imagining and
            we'll turn your idea into a handmade crochet piece — your colours,
            your design, your little work of art.
          </p>

          {/* the customization desk */}
          <div
            ref={deskWrapRef}
            className="relative mt-2 aspect-[4/3] w-full max-w-md self-center overflow-hidden rounded-[2.25rem] shadow-lift lg:self-start"
          >
            {showDesk3D ? (
              <DeskScene active={deskNear} />
            ) : (
              <Image
                src={withBasePath("/images/hero-fallback.jpg")}
                alt="A crochet customization desk with a bouquet, pastel yarn balls, a wooden hook, ribbon and a small gift box"
                fill
                sizes="(min-width: 1024px) 40vw, 92vw"
                className="object-cover"
              />
            )}
            <span className="pointer-events-none absolute bottom-3 right-4 -rotate-2 font-hand text-lg text-white/95 drop-shadow">
              the little desk of possibilities
            </span>
          </div>

          <p className="text-sm font-semibold text-cocoa-soft">
            Prefer WhatsApp?{" "}
            <a
              href={waLink(waMessages.custom)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-rose-ink underline decoration-blush-deep decoration-2 underline-offset-4 transition-colors hover:text-cocoa"
            >
              <WhatsAppGlyph className="h-4 w-4" /> Chat With Whimlet
            </a>
          </p>
        </Reveal>

        {/* ---------- right: the wizard ---------- */}
        <Reveal delay={0.12} className="card relative overflow-hidden p-6 shadow-lift md:p-9">
          {/* progress — little yarn balls */}
          <div className="mb-7 flex items-center justify-between gap-2" role="group" aria-label={`Step ${step + 1} of ${STEP_LABELS.length}: ${STEP_LABELS[step]}`}>
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-400 ${
                    i < step
                      ? "border-rose bg-rose"
                      : i === step
                        ? "border-rose bg-blush shadow-soft"
                        : "border-rose/35 bg-transparent"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`text-[0.6rem] font-bold uppercase tracking-wider transition-colors ${
                    i === step ? "text-rose-ink" : "text-cocoa-soft/60"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step + (form.sent ? "-sent" : "")}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -28 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-[21rem]"
            >
              {/* STEP 1 — type */}
              {step === 0 && (
                <fieldset>
                  <legend className="font-hand text-2xl text-rose-ink">What are you looking for?</legend>
                  <p className="mt-1 text-sm text-cocoa-soft">Pick one to get us started.</p>
                  <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {TYPES.map((t) => {
                      const active = form.type === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => set("type", t.id)}
                          aria-pressed={active}
                          className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3.5 transition-all duration-300 ${
                            active
                              ? "border-rose bg-blush-soft shadow-soft"
                              : "border-blush-deep/30 bg-white/60 hover:border-rose/60 hover:bg-blush-soft/40"
                          }`}
                        >
                          <t.icon className={`h-6 w-6 ${active ? "text-rose-ink" : "text-cocoa-soft"}`} />
                          <span className="text-xs font-bold text-cocoa">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-sm text-cocoa-soft">
                    Prefer to see it first?{" "}
                    <a
                      href="#studio"
                      className="font-semibold text-rose-ink underline decoration-blush-deep decoration-2 underline-offset-4 transition-colors hover:text-cocoa"
                    >
                      design it in the 3D studio →
                    </a>
                  </p>
                </fieldset>
              )}

              {/* STEP 2 — vibe */}
              {step === 1 && (
                <fieldset>
                  <legend className="font-hand text-2xl text-rose-ink">Pick your vibe.</legend>
                  <p className="mt-1 text-sm text-cocoa-soft">Choose as many as you like.</p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {VIBES.map((vibe) => {
                      const active = form.vibes.includes(vibe);
                      return (
                        <button
                          key={vibe}
                          type="button"
                          onClick={() => toggleVibe(vibe)}
                          aria-pressed={active}
                          className={`rounded-full border-2 px-4.5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                            active
                              ? "border-rose bg-blush text-cocoa shadow-soft"
                              : "border-blush-deep/30 bg-white/60 text-cocoa-soft hover:border-rose/60"
                          }`}
                        >
                          {vibe}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* STEP 3 — idea */}
              {step === 2 && (
                <div>
                  <label htmlFor="custom-idea" className="font-hand block text-2xl text-rose-ink">
                    Tell us your idea.
                  </label>
                  <p className="mt-1 text-sm text-cocoa-soft">
                    Colours, flowers, characters, themes, sizes — anything you're dreaming of.
                  </p>
                  <textarea
                    id="custom-idea"
                    rows={6}
                    value={form.idea}
                    onChange={(e) => set("idea", e.target.value)}
                    placeholder="e.g. a small bouquet of pink and cream roses for my best friend's birthday…"
                    className="mt-4 w-full resize-none rounded-2xl border-2 border-blush-deep/30 bg-white/70 p-4 text-cocoa placeholder:text-cocoa-soft/50 focus:border-rose focus:outline-none"
                  />
                </div>
              )}

              {/* STEP 4 — extra */}
              {step === 3 && (
                <div>
                  <label htmlFor="custom-extra" className="font-hand block text-2xl text-rose-ink">
                    Anything else?
                  </label>
                  <p className="mt-1 text-sm text-cocoa-soft">
                    An occasion, a deadline, a little detail — totally optional.
                  </p>
                  <textarea
                    id="custom-extra"
                    rows={4}
                    value={form.extra}
                    onChange={(e) => set("extra", e.target.value)}
                    placeholder="e.g. it's a gift, so maybe a little wrapping?"
                    className="mt-4 w-full resize-none rounded-2xl border-2 border-blush-deep/30 bg-white/70 p-4 text-cocoa placeholder:text-cocoa-soft/50 focus:border-rose focus:outline-none"
                  />
                  <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-blush-soft/50 p-3.5 text-sm font-medium text-cocoa">
                    <GiftDoodle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-rose-ink" />
                    Have reference photos or inspiration? You can share them
                    right in the WhatsApp chat after sending this — we'd love to
                    see them.
                  </p>
                </div>
              )}

              {/* STEP 5 — contact */}
              {step === 4 && (
                <div>
                  <p className="font-hand text-2xl text-rose-ink">Almost there — who are you?</p>
                  <p className="mt-1 text-sm text-cocoa-soft">
                    Just a name is needed; phone or email help us reply even faster.
                  </p>
                  <div className="mt-5 flex flex-col gap-4">
                    <div>
                      <label htmlFor="custom-name" className="text-sm font-bold text-cocoa">
                        Your name <span className="text-rose-ink" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="custom-name"
                        type="text"
                        autoComplete="name"
                        required
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        className="mt-1.5 w-full rounded-2xl border-2 border-blush-deep/30 bg-white/70 px-4 py-3 text-cocoa focus:border-rose focus:outline-none"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="custom-phone" className="text-sm font-bold text-cocoa">
                          Phone <span className="font-medium text-cocoa-soft">(optional)</span>
                        </label>
                        <input
                          id="custom-phone"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          className="mt-1.5 w-full rounded-2xl border-2 border-blush-deep/30 bg-white/70 px-4 py-3 text-cocoa focus:border-rose focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="custom-email" className="text-sm font-bold text-cocoa">
                          Email <span className="font-medium text-cocoa-soft">(optional)</span>
                        </label>
                        <input
                          id="custom-email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                          className="mt-1.5 w-full rounded-2xl border-2 border-blush-deep/30 bg-white/70 px-4 py-3 text-cocoa focus:border-rose focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6 — review & send */}
              {step === 5 && !form.sent && (
                <div>
                  <p className="font-hand text-2xl text-rose-ink">All ready — take a peek!</p>
                  <dl className="mt-4 flex flex-col gap-2.5 rounded-2xl bg-blush-soft/40 p-5 text-sm">
                    <ReviewRow label="Looking for" value={form.type} />
                    <ReviewRow label="Vibe" value={form.vibes.join(", ") || "—"} />
                    <ReviewRow label="My idea" value={form.idea.trim()} />
                    {form.extra.trim() && <ReviewRow label="Anything else" value={form.extra.trim()} />}
                    <ReviewRow label="Name" value={form.name.trim()} />
                    {form.phone.trim() && <ReviewRow label="Phone" value={form.phone.trim()} />}
                    {form.email.trim() && <ReviewRow label="Email" value={form.email.trim()} />}
                  </dl>
                  <p className="mt-3 text-xs text-cocoa-soft">
                    Sending opens WhatsApp with your enquiry prefilled — just press send there.
                  </p>
                </div>
              )}

              {/* sent confirmation */}
              {step === 5 && form.sent && (
                <div className="flex min-h-[21rem] flex-col items-center justify-center gap-4 text-center" role="status">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blush-soft text-rose-ink">
                    <HeartDoodle className="h-8 w-8 animate-heartbeat" />
                  </span>
                  <p className="font-hand text-3xl text-rose-ink">Off it goes!</p>
                  <p className="max-w-xs text-sm leading-relaxed text-cocoa-soft">
                    Your WhatsApp chat should have opened with your enquiry
                    prefilled — press send there and we'll take it from there.
                    If it didn't open, tap below.
                  </p>
                  <a
                    href={waLink(message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-md"
                  >
                    <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} /> Open WhatsApp Again
                  </a>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* validation message */}
          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-dusty">
              {error}
            </p>
          )}

          {/* nav */}
          {!form.sent && (
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="btn btn-sm rounded-full px-5 py-2.5 text-cocoa-soft transition-colors hover:text-rose-ink disabled:cursor-not-allowed disabled:opacity-35"
              >
                ← Back
              </button>
              {step < 5 ? (
                <button type="button" onClick={next} className="btn btn-primary btn-md min-w-28">
                  Next →
                </button>
              ) : (
                <a
                  href={waLink(message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => set("sent", true)}
                  className="btn btn-whatsapp btn-md min-w-40"
                >
                  <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
                  Send My Enquiry
                </a>
              )}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="min-w-28 font-bold text-cocoa">{label}:</dt>
      <dd className="text-cocoa-soft">{value}</dd>
    </div>
  );
}
