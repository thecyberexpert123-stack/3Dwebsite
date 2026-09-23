/**
 * Whimlet Engine — device strain (Compute Pressure → workload governor).
 *
 * The scenes already adapt to a *static* tier (GPU class) and correct it with
 * measured frame rate. What they cannot see is the device itself getting hot,
 * throttling or running a heavy background app — the exact moment a phone
 * turns "60 fps at launch" into "20 fps after ten minutes". The 2026 Compute
 * Pressure API exists for precisely this: the browser reports a coarse,
 * privacy-safe pressure state so an app can shed load *before* the user feels
 * it (the W3C spec literally recommends it over waiting for frame drops).
 *
 * This module turns pressure states into the one signal the rest of the engine
 * already understands — a tier — so an overloaded phone quietly steps down
 * (and back up when it cools). Chromium-only today, behind no user gesture
 * but *only* over HTTPS; everywhere unsupported it is a no-op and the engine
 * keeps behaving exactly as before.
 *
 * Nothing here touches a scene or a style: it only nudges `quality.ts`, which
 * the existing `AdaptiveCanvas` / `useQuality` already read reactively.
 */

export type PressureState = "nominal" | "fair" | "serious" | "critical";
export type Strain = "idle" | "nominal" | "busy" | "hot";

/** One coarse, human-readable state that the whole engine can key off. */
export function strainFromPressure(state: PressureState | null, flinging: boolean): Strain {
  if (state === "critical") return "hot";
  if (state === "serious") return "busy";
  if (state === "fair" || flinging) return "nominal";
  return "idle";
}

/** Is the Compute Pressure API available enough to use at all? */
export function pressureSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false; // SecureContext only
  if (!("PressureObserver" in window)) return false;
  return true;
}

/**
 * Observe CPU pressure indefinitely; for browsers that also wire the
 * `thermals` source the OS may use it to compute those states. `onChange`
 * fires with the state (or null when a source reports nothing useful).
 * Returns an unsubscribe. Every failure is swallowed — the feature is a
 * progressive enhancement with a clean static fallback.
 */
export function installPressureObserver(onChange: (state: PressureState | null) => void): () => void {
  if (!pressureSupported()) return () => {};
  interface Native {
    PressureObserver: new (cb: (records: { state: PressureState }[]) => void) => {
      observe: (source: string, opts?: { sampleInterval?: number }) => Promise<unknown>;
      unobserve: (source: string) => void;
      disconnect: () => void;
      takeRecords: () => { state: PressureState }[];
    };
  }
  const Native = (window as unknown as Native).PressureObserver;
  try {
    const observer = new Native((records) => onChange(records[records.length - 1]?.state ?? null));
    void observer.observe("cpu", { sampleInterval: 1000 }).then(() => {
      // take any immediately-available record so the first signal doesn't wait a second
      try {
        const recs = observer.takeRecords();
        if (recs.length) onChange(recs[recs.length - 1].state);
      } catch {
        /* older engines */
      }
    });
    return () => {
      try {
        observer.disconnect();
      } catch {
        /* ignore */
      }
    };
  } catch {
    return () => {};
  }
}
