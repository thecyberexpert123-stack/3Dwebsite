"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children at the end of <body>.
 *
 * Every home-page section is wrapped in a `Beat` whose perspective transform
 * makes the section the containing block for `position: fixed` descendants
 * (CSS Transforms §"containing block"). A dialog rendered inside a section
 * is therefore positioned against that section, not the viewport: deep in a
 * long grid it opened above the fold; on phones the sheet's CTA hung below
 * the screen. Overlays mount here instead. Renders nothing during SSR — the
 * overlays are never open on the server.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  return host ? createPortal(children, host) : null;
}
