/**
 * Hand-drawn SVG doodle library — tiny decorative surprises.
 * All are aria-hidden decorations; colour inherits from `currentColor`.
 * Used sparingly across sections to keep visual breathing room.
 */

import type { SVGProps } from "react";

type DoodleProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function HeartDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        {...stroke}
        d="M12 20.2C7.6 17.4 3.4 13.9 3.4 9.6 3.4 6.9 5.5 5 8 5c1.6 0 3 .8 4 2.1C13 5.8 14.4 5 16 5c2.5 0 4.6 1.9 4.6 4.6 0 4.3-4.2 7.8-8.6 10.6z"
      />
    </svg>
  );
}

export function FlowerDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g {...stroke}>
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse
            key={deg}
            cx="12"
            cy="7"
            rx="2.1"
            ry="3.1"
            transform={`rotate(${deg} 12 12)`}
          />
        ))}
        <circle cx="12" cy="12" r="2" />
      </g>
    </svg>
  );
}

export function LeafDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g {...stroke}>
        <path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14z" />
        <path d="M7.5 16.5C10 13.7 13 10.6 16.5 8.2" />
      </g>
    </svg>
  );
}

export function BowDoodle(props: DoodleProps) {
  // round satin loops + soft tails; filled with a translucent tint of currentColor
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g {...stroke} strokeWidth={1.4}>
        <path
          d="M12 11.2C10.4 8.6 6.4 6.6 4.6 8.4c-1.7 1.8-.2 5.6 2.9 6.2 2 .4 3.9-.8 4.5-3.4z"
          fill="currentColor"
          fillOpacity="0.28"
        />
        <path
          d="M12 11.2c1.6-2.6 5.6-4.6 7.4-2.8 1.7 1.8.2 5.6-2.9 6.2-2 .4-3.9-.8-4.5-3.4z"
          fill="currentColor"
          fillOpacity="0.28"
        />
        <path d="M10.6 12.6c-1.4 2-2.2 4.3-2.4 6.6M13.4 12.6c1.4 2 2.2 4.3 2.4 6.6" />
        <ellipse cx="12" cy="11.4" rx="1.7" ry="1.5" fill="currentColor" fillOpacity="0.5" />
      </g>
    </svg>
  );
}

export function StitchDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        {...stroke}
        d="M3 12c3-4.5 6 4.5 9 0s6 4.5 9 0"
        strokeDasharray="3.5 3.5"
      />
    </svg>
  );
}

export function SparkleDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        {...stroke}
        d="M12 4l1.8 6.2L20 12l-6.2 1.8L12 20l-1.8-6.2L4 12l6.2-1.8z"
      />
    </svg>
  );
}

export function LadybugDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g {...stroke}>
        <circle cx="12" cy="13.5" r="6.2" />
        <circle cx="12" cy="6.4" r="2.4" />
        <path d="M12 7.5v12" />
        <path d="M7.4 18.2 5 20.6M16.6 18.2 19 20.6" />
      </g>
      <g fill="currentColor" stroke="none">
        <circle cx="9.6" cy="11.8" r="0.9" />
        <circle cx="14.4" cy="11.8" r="0.9" />
        <circle cx="9.9" cy="15.6" r="0.9" />
        <circle cx="14.1" cy="15.6" r="0.9" />
      </g>
    </svg>
  );
}

export function YarnDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g {...stroke}>
        <circle cx="12" cy="12" r="7.6" />
        <path d="M4.4 12c2.8-2.8 6.9-5 7.6-5s4.8 2.2 7.6 5" />
        <path d="M6.2 8.6c1.9 2.7 5.8 4.9 5.8 4.9s3.9-2.2 5.8-4.9" />
        <path d="M6.2 15.4c1.9-2.7 5.8-4.9 5.8-4.9s3.9 2.2 5.8 4.9" />
      </g>
    </svg>
  );
}

/* ---- icon doodles for the "Why Handmade?" principles ---- */

export function HookDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g {...stroke}>
        <path d="M15 4.5v9a3 3 0 1 1-6 0v-.6" />
        <path d="M13 4.5h4" />
      </g>
    </svg>
  );
}

export function PencilDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g {...stroke}>
        <path d="M5 19l1-4L16.5 4.5a1.8 1.8 0 0 1 2.5 0v0a1.8 1.8 0 0 1 0 2.5L8.5 18l-3.5 1z" />
        <path d="M14.5 6.5l2.8 2.8" />
      </g>
    </svg>
  );
}

export function SwatchesDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g {...stroke}>
        <rect x="3.5" y="8" width="5" height="11.5" rx="1.4" transform="rotate(-9 6 14)" />
        <rect x="9.5" y="6.5" width="5" height="13" rx="1.4" />
        <rect x="15.5" y="8" width="5" height="11.5" rx="1.4" transform="rotate(9 18 14)" />
      </g>
    </svg>
  );
}

export function GiftDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g {...stroke}>
        <rect x="4.5" y="10.5" width="15" height="9.5" rx="1.8" />
        <path d="M4.5 10.5h15M12 10.5V20" />
        <path d="M12 10.5c-4.2 0-4.8-3.7-2.7-5C11 4.4 12 7.4 12 10.5c0-3.1 1-6.1 2.7-5 2.1 1.3 1.5 5-2.7 5z" />
      </g>
    </svg>
  );
}

/* ---- utility icons ---- */

export function WhatsAppGlyph(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        {...stroke}
        d="M12 3.4a8.5 8.5 0 0 0-7.2 13L3.6 20.6l4.3-1.2A8.5 8.5 0 1 0 12 3.4z"
      />
      <path
        {...stroke}
        d="M12 14.4c-1.5-.4-2.6-1.6-2.9-3.1-.2-1 .4-1.9 1.4-2.1.5-.1 1 .1 1.2.5l.4.7c.2.3.1.7-.2.9l-.4.3c.3.6.8 1.1 1.4 1.4l.3-.4c.2-.3.6-.4.9-.2l.7.4c.4.2.6.7.5 1.2-.3 1-1.3 1.5-2.4 1.3-.3-.1-.6-.2-.9-.3z"
        strokeWidth={1.3}
      />
    </svg>
  );
}

export function PhoneDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        {...stroke}
        d="M5.5 4h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L16 14l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 6.2 2 2 0 0 1 5.5 4z"
      />
    </svg>
  );
}

export function ArrowDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

/** Undo / redo / rotate arrows — the site's fonts have no ↶ ↷ ↻ glyphs
 *  (Latin subsets), so these are drawn instead of falling back to tofu. */
export function UndoDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M9 14 4 9l5-5M4 9h9.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}
export function RedoDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="m15 14 5-5-5-5M20 9h-9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  );
}
export function RotateDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M20 12a8 8 0 1 1-2.9-6.2M20 4v5h-5" />
    </svg>
  );
}

/** Small squiggly underline for handwritten annotations. */
export function SquiggleDoodle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 60 8" aria-hidden="true" preserveAspectRatio="none" {...props}>
      <path
        {...stroke}
        d="M2 5c6-4 12 4 18 0s12 4 18 0 12 4 18 0"
        strokeDasharray="4 3"
      />
    </svg>
  );
}
