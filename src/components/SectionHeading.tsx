import type { ReactNode } from "react";
import { HeartDoodle } from "@/components/Decorations";
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
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-rose">
        <HeartDoodle className="h-3.5 w-3.5" strokeWidth={1.8} />
        {eyebrow}
        <HeartDoodle className="h-3.5 w-3.5" strokeWidth={1.8} />
      </p>
      <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-cocoa md:text-5xl">
        {typeof title === "string" ? <TextReveal text={title} /> : title}
        {accent ? (
          <>
            {" "}
            <TextReveal text={accent} className="font-script font-normal text-rose" stagger={0.09} />
          </>
        ) : null}
      </h2>
      {lead ? (
        <p className="text-pretty text-base leading-relaxed text-cocoa-soft md:text-lg">{lead}</p>
      ) : null}
    </Reveal>
  );
}
