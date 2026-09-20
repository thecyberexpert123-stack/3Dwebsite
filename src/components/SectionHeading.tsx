import type { ReactNode } from "react";
import { BowDoodle, SparkleDoodle } from "@/components/Decorations";
import { Reveal, TextReveal } from "@/components/Reveal";

type SectionHeadingProps = {
  eyebrow: string;
  /** plain text ⇒ word-by-word masked reveal; ReactNode ⇒ soft fade (for mixed script/sans titles) */
  title: ReactNode;
  /** optional script-styled tail rendered after `title` (e.g. "Make You Smile") */
  accent?: string;
  lead?: ReactNode;
  align?: "center" | "left";
  className?: string;
};

/** Consistent editorial section heading: eyebrow · title · lead. */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  lead,
  align = "center",
  className = "",
}: SectionHeadingProps) {
  const alignCls = align === "center" ? "text-center mx-auto items-center" : "text-left items-start";

  return (
    <Reveal className={`flex max-w-2xl flex-col gap-4 ${alignCls} ${className}`}>
      <p className="inline-flex items-center gap-2 rounded-full bg-whitish/90 px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-rose-ink shadow-clay-sm">
        <BowDoodle className="h-3.5 w-3.5" />
        {eyebrow}
        <SparkleDoodle className="h-3 w-3 animate-twinkle" />
      </p>
      <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-cocoa md:text-5xl">
        {typeof title === "string" ? <TextReveal text={title} /> : title}
        {accent ? (
          <>
            {" "}
            <TextReveal text={accent} className="font-script font-normal text-rose-ink" stagger={0.09} />
          </>
        ) : null}
      </h2>
      {lead ? (
        <p className="text-pretty text-base leading-relaxed text-cocoa-soft md:text-lg">{lead}</p>
      ) : null}
    </Reveal>
  );
}
