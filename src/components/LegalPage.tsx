import type { ReactNode } from "react";
import { site } from "@/data/site";
import { PHONE_DISPLAY, PHONE_TEL, waLink, waMessages } from "@/lib/whatsapp";
import { Reveal } from "@/components/Reveal";
import { HeartDoodle, WhatsAppGlyph } from "@/components/Decorations";

/**
 * Shared chrome for the public policy pages (/privacy, /terms): an editorial
 * header, a readable prose column, and one contact card at the end. The two
 * documents are different enough that each owns its copy; only layout is
 * shared so they can never drift apart visually.
 */

/* Small prose building blocks — kept here so the two pages read identically. */
export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 text-xl font-bold text-cocoa md:text-2xl">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-base leading-relaxed text-cocoa-soft">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-3 flex flex-col gap-2.5 text-base leading-relaxed text-cocoa-soft">
      {children}
    </ul>
  );
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <HeartDoodle className="mt-1.5 h-3.5 w-3.5 shrink-0 text-rose" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

type LegalPageProps = {
  kicker: string;
  title: string;
  updated: string;
  intro?: ReactNode;
  children: ReactNode;
};

export function LegalPage({ kicker, title, updated, intro, children }: LegalPageProps) {
  return (
    <div className="pb-24 pt-28 md:pt-36">
      <article className="mx-auto w-full max-w-3xl px-5 md:px-8">
        <Reveal className="flex flex-col gap-3">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-whitish/90 px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-rose-ink shadow-clay-sm">
            <HeartDoodle className="h-3.5 w-3.5" aria-hidden="true" />
            {kicker}
          </p>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-cocoa md:text-5xl">
            {title}
          </h1>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cocoa-soft/80">
            Last updated · {updated}
          </p>
          {intro ? <div className="mt-2">{intro}</div> : null}
        </Reveal>

        {children}

        {/* contact card */}
        <Reveal className="mt-14 rounded-[1.6rem] border border-white/70 bg-white/70 p-6 shadow-card backdrop-blur-md md:p-7">
          <h2 className="text-lg font-bold text-cocoa">Questions about this?</h2>
          <p className="mt-2 text-sm leading-relaxed text-cocoa-soft">
            Write to <a href={`mailto:${site.email}`} className="font-semibold text-rose-ink underline decoration-rose/40 underline-offset-2">{site.email}</a>,
            call{" "}
            <a href={`tel:${PHONE_TEL}`} className="font-semibold text-rose-ink underline decoration-rose/40 underline-offset-2">
              {PHONE_DISPLAY}
            </a>{" "}
            or reach us on WhatsApp.
          </p>
          <a
            href={waLink(waMessages.general)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-md mt-4"
          >
            <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
            Chat on WhatsApp
          </a>
        </Reveal>
      </article>
    </div>
  );
}
