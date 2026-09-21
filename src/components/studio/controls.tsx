"use client";

import { useState } from "react";
import { HeartDoodle } from "../Decorations";

/* ------------------------------------------------------------------
   Studio control kit — shared by the homepage teaser, the full-page
   studio and the admin viewer. Every control is a real button/switch
   with aria state; no div-buttons.
   ------------------------------------------------------------------ */

export function ControlGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="font-hand text-xl text-rose-ink">
        {label}
        {hint && <span className="ml-2 font-body text-xs font-semibold text-cocoa-soft">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-cocoa-soft">{label}</span>
      {children}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
}: {
  options: { value: T; label: string; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5 rounded-full bg-blush-soft/40 p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`rounded-full transition-all duration-300 ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"} ${
              active ? "bg-blush font-bold text-cocoa shadow-card" : "font-semibold text-cocoa-soft hover:text-rose-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const LIGHT_SWATCHES = ["#F6E9D8", "#FFF7F0", "#F0D5A8", "#F2CD8D", "#A9BFA3", "#FFFBF5", "#FFF6EA", "#FFFCF8", "#F6EBDA", "#CDEBDF", "#BFDCF7", "#F7E2A4", "#F7C9B0", "#DCCFF0", "#C7D9C2", "#F7D3DC", "#CBB6EA"];

export function Swatches({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  disabledNote,
  compact = false,
}: {
  options: { name: string; hex: string }[];
  value: string;
  onChange: (hex: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  disabledNote?: string;
  compact?: boolean;
}) {
  const [customHex, setCustomHex] = useState("#E8B4C8");
  const isKnown = options.some((o) => o.hex.toUpperCase() === value.toUpperCase());
  const dim = compact ? "h-8 w-8" : "h-10 w-10";

  return (
    <div className={`flex flex-col gap-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <div role="group" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
        {options.map((o) => {
          const active = value.toUpperCase() === o.hex.toUpperCase();
          return (
            <button
              key={o.hex}
              type="button"
              onClick={() => onChange(o.hex)}
              aria-pressed={active}
              aria-label={o.name}
              title={o.name}
              disabled={disabled}
              className={`flex ${dim} items-center justify-center rounded-full border-2 transition-all duration-300 ${
                active ? "scale-110 border-cocoa shadow-soft" : "border-white/80 hover:scale-105"
              }`}
              style={{ backgroundColor: o.hex }}
            >
              {active && <HeartDoodle className={LIGHT_SWATCHES.includes(o.hex) ? "h-4 w-4 text-cocoa" : "h-4 w-4 text-white"} />}
            </button>
          );
        })}

        {/* custom picker */}
        <label
          className={`relative flex ${dim} cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-300 ${
            !isKnown ? "scale-110 border-cocoa shadow-soft" : "border-white/80 hover:scale-105"
          }`}
          style={{ background: `conic-gradient(${!isKnown ? value : customHex} 0 25%, #F2B9C9 0 50%, #A9BFA3 0 75%, #CBB6EA 0)` }}
          title="Pick your own colour"
        >
          <input
            type="color"
            value={!isKnown ? value : customHex}
            onChange={(e) => {
              setCustomHex(e.target.value);
              onChange(e.target.value.toUpperCase());
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${ariaLabel} — custom colour`}
            disabled={disabled}
          />
        </label>
      </div>
      {disabled && disabledNote && <p className="text-xs text-cocoa-soft">{disabledNote}</p>}
    </div>
  );
}

export function ToggleSwitch({ label, checked, onChange, small = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; small?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-fit items-center gap-3 rounded-full border-2 font-semibold transition-all duration-300 ${small ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm"} ${
        checked ? "border-rose bg-blush-soft text-cocoa" : "border-blush-deep/30 bg-white/60 text-cocoa-soft hover:border-rose/50"
      }`}
    >
      <span aria-hidden="true" className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-300 ${checked ? "bg-rose" : "bg-blush-deep/30"}`}>
        <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${checked ? "translate-x-4" : ""}`} />
      </span>
      {label}
    </button>
  );
}

/** Text input with a live counter, styled like the rest of the kit. */
export function TextInput({
  label,
  value,
  onChange,
  max,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  multiline?: boolean;
}) {
  const cls = "w-full rounded-2xl border border-blush-deep/30 bg-white/70 px-3.5 py-2 text-sm text-cocoa placeholder:text-cocoa-soft/60 focus:border-rose focus:outline-none";
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-cocoa-soft">
        {label}
        <span className="font-body text-[10px] normal-case tracking-normal">
          {value.length}/{max}
        </span>
      </span>
      {multiline ? (
        <textarea value={value} maxLength={max} rows={2} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input type="text" value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}

/** Colour chip used by spec sheets and palettes (read-only). */
export function ColourChip({ hex, name, role, large = false }: { hex: string; name: string; role?: string; large?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden="true" className={`${large ? "h-10 w-10" : "h-7 w-7"} shrink-0 rounded-full border-2 border-white shadow-soft`} style={{ backgroundColor: hex }} />
      <div className="min-w-0 leading-tight">
        {role && <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-cocoa-soft">{role}</p>}
        <p className="truncate text-sm font-semibold text-cocoa">
          {name} <span className="font-mono text-[11px] text-cocoa-soft">{hex.toUpperCase()}</span>
        </p>
      </div>
    </div>
  );
}
