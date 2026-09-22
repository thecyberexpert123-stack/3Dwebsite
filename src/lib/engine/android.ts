/**
 * Whimlet Engine — Android runtime shim.
 *
 * Behaviours Android users expect from an app, delivered around the existing
 * components (none of them change):
 *
 *  1. **Hardware Back closes overlays.** Every open `[role="dialog"]` (gallery
 *     lightbox, product sheet, mobile menu, gift door) gets a history entry
 *     while it is open; the system Back button pops it and we dispatch the
 *     same `Escape` keydown the component already listens for. Without this
 *     Back leaves the site (or the installed app) with the sheet still open.
 *
 *  2. **Keyboard-safe fixed UI.** With `interactive-widget=resizes-visual` the
 *     layout viewport stays put when the soft keyboard opens; we mirror the
 *     visual-viewport height into `--vvh` so bottom-anchored glass sheets can
 *     stay above the keyboard (CSS in globals.css).
 *
 *  3. **Standalone detection.** `html.pwa` when running installed (home-screen
 *     / TWA) so CSS can adjust safe areas; also tags `?source=pwa` visits.
 *
 * Pure decision helpers are exported for the unit tests; the DOM wiring is in
 * `installAndroidShim()`.
 */

export type BackDecision = "close-dialog" | "leave";

/** With N dialogs open, what should hardware Back do? */
export function decideBack(openDialogs: number): BackDecision {
  return openDialogs > 0 ? "close-dialog" : "leave";
}

/**
 * Should we push a history entry for a newly opened dialog? Never twice for
 * the same element, and not for the welcome door (`.candy`): it is an
 * entrance, not a dismissible overlay — Back there should leave as usual.
 */
export function shouldPushEntry(el: Element, tracked: WeakSet<Element>): boolean {
  if (tracked.has(el)) return false;
  if (el.classList.contains("candy")) return false;
  return el.getAttribute("role") === "dialog" && el.getAttribute("aria-modal") === "true";
}

const STATE_KEY = "whimlet-dialog";

export function installAndroidShim(): () => void {
  if (typeof window === "undefined") return () => {};
  const html = document.documentElement;
  const offs: (() => void)[] = [];

  /* ---- 3. standalone ---- */
  const mq = window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)");
  const syncMode = () => html.classList.toggle("pwa", mq.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  syncMode();
  mq.addEventListener("change", syncMode);
  offs.push(() => mq.removeEventListener("change", syncMode));

  /* ---- 2. visual viewport → --vvh ---- */
  const vv = window.visualViewport;
  if (vv) {
    let raf = 0;
    const apply = () => {
      raf = 0;
      html.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
      // keyboard open ≈ viewport shrank by more than a quarter
      html.classList.toggle("kbd-open", vv.height < window.innerHeight * 0.75);
    };
    const onVV = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    vv.addEventListener("resize", onVV);
    offs.push(() => {
      vv.removeEventListener("resize", onVV);
      cancelAnimationFrame(raf);
    });
  }

  /* ---- 1. hardware Back ↔ dialogs ---- */
  const tracked = new WeakSet<Element>();
  let open: Element[] = [];
  const closeTop = () => {
    const top = open[open.length - 1];
    if (!top) return;
    // the components already close on Escape (window listener) — reuse it
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  };
  const onPop = (e: PopStateEvent) => {
    // Back popped our entry while a dialog is still open → close it. When the
    // dialog closed itself first, `scan()` already removed it from `open`
    // before calling history.back(), so this is a no-op then.
    if (decideBack(open.length) === "close-dialog" && !(e.state && e.state[STATE_KEY])) closeTop();
  };
  window.addEventListener("popstate", onPop);
  offs.push(() => window.removeEventListener("popstate", onPop));

  const isTracked = (el: Element) => tracked.has(el);
  const scan = () => {
    const now = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]')).filter((el) => !el.classList.contains("candy"));
    // newly opened → one history entry each
    for (const el of now) {
      if (shouldPushEntry(el, tracked)) {
        tracked.add(el);
        history.pushState({ ...(history.state ?? {}), [STATE_KEY]: true }, "");
      }
    }
    // closed by its own UI (×, backdrop, Escape) → consume the entry we pushed
    const closed = open.some((el) => !now.includes(el) && isTracked(el));
    open = now;
    if (closed && history.state && history.state[STATE_KEY]) history.back();
  };
  let raf = 0;
  const mo = new MutationObserver(() => {
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      scan();
    });
  });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["role", "aria-modal"] });
  scan();
  offs.push(() => {
    mo.disconnect();
    cancelAnimationFrame(raf);
  });

  return () => offs.forEach((f) => f());
}
