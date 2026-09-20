"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dequantizePetal, processSketch, quantizePetal, type Pt } from "@/lib/sketch";

type PetalSketchProps = {
  /** current petal colour — used for the ink and the preview */
  color: string;
  centerColor?: string;
  petalCount?: number;
  /** existing quantized petal to keep editing (or null) */
  initial?: number[] | null;
  onApply: (data: number[]) => void;
  onCancel: () => void;
};

/**
 * The sketch pad: draw one petal, and the smoothing pipeline turns it into
 * a clean outline (dashed guide shows the classic petal; the solid overlay
 * is your sketch after smoothing). "Make it 3D" pushes the outline into the
 * studio config, where it's extruded into real crochet geometry.
 */
export function PetalSketch({
  color,
  centerColor = "#F0D5A8",
  petalCount = 6,
  initial,
  onApply,
  onCancel,
}: PetalSketchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const sizeRef = useRef(300);

  // points are stored normalised: x 0..1 left→right, y 0..1 bottom→top
  const [rawPts, setRawPts] = useState<Pt[] | null>(() =>
    initial
      ? dequantizePetal(initial).map((p) => ({ x: p.x + 0.5, y: p.y }))
      : null
  );
  const [smoothed, setSmoothed] = useState<Pt[] | null>(null);
  const [symmetric, setSymmetric] = useState(true);
  const [hint, setHint] = useState("");

  /* ---------- the smoothing pipeline, live ---------- */
  useEffect(() => {
    if (!rawPts || rawPts.length === 0) return;
    try {
      setSmoothed(processSketch(rawPts, symmetric));
      setHint("");
    } catch (err) {
      if (drawingRef.current) {
        // mid-stroke hiccups are normal (short segments) — stay quiet
        return;
      }
      setSmoothed(null);
      setHint(err instanceof Error ? err.message : "hmm, that sketch didn't work — try again");
    }
  }, [rawPts, symmetric]);

  /* ---------- canvas painting ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const paint = () => {
      const S = wrap.clientWidth;
      if (S === 0) return;
      sizeRef.current = S;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = S * dpr;
      canvas.height = S * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);

      // paper
      ctx.fillStyle = "#FFFBF3";
      ctx.fillRect(0, 0, S, S);

      const pad = S * 0.1;
      const inner = S - 2 * pad;
      const toCanvas = (p: Pt): Pt => ({
        x: pad + p.x * inner,
        y: pad + (1 - p.y) * inner,
      });

      // guide: a classic petal, dashed, very faint
      ctx.save();
      ctx.strokeStyle = "#E7C9CF";
      ctx.setLineDash([6, 7]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = (i / 60) * Math.PI * 2;
        const y = (Math.cos(t) + 1) / 2;
        const x = Math.sin(t) * 0.36 * (0.62 + 0.38 * (1 - y)) + 0.5;
        const c = toCanvas({ x, y });
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // symmetry axis
      if (symmetric) {
        ctx.save();
        ctx.strokeStyle = "#D9C3B6";
        ctx.setLineDash([3, 6]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(S / 2, pad * 0.4);
        ctx.lineTo(S / 2, S - pad * 0.4);
        ctx.stroke();
        ctx.restore();
      }

      // the user's raw stroke
      if (rawPts && rawPts.length > 1) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        rawPts.forEach((p, i) => {
          const c = toCanvas(p);
          if (i === 0) ctx.moveTo(c.x, c.y);
          else ctx.lineTo(c.x, c.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // the smoothed outline
      if (smoothed) {
        ctx.save();
        ctx.beginPath();
        smoothed.forEach((p, i) => {
          const c = toCanvas(p);
          if (i === 0) ctx.moveTo(c.x, c.y);
          else ctx.lineTo(c.x, c.y);
        });
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.22;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#8A6A5C";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.restore();
      }
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [rawPts, smoothed, symmetric, color]);

  /* ---------- pointer handling ---------- */
  const normPt = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height)),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    setSmoothed(null);
    setHint("");
    setRawPts([normPt(e)]);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const p = normPt(e);
    setRawPts((pts) => {
      if (!pts || pts.length === 0) return [p];
      const last = pts[pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 0.004) return pts; // ignore jitter
      return [...pts, p];
    });
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setRawPts((pts) => {
      if (!pts || pts.length < 10) {
        setHint("keep going — draw a full petal outline in one stroke");
        return pts;
      }
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      for (const p of pts) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
      if (Math.hypot(maxX - minX, maxY - minY) < 0.12) {
        setHint("a little bigger, please — give the petal some room");
        return pts;
      }
      try {
        setSmoothed(processSketch(pts, symmetric));
        setHint("");
      } catch (err) {
        setHint(err instanceof Error ? err.message : "hmm, that sketch didn't work — try again");
      }
      return pts;
    });
  };

  /* ---------- radial preview (the real geometry, top view) ---------- */
  const preview = useMemo(() => {
    if (!smoothed) return null;
    const d =
      "M " +
      smoothed
        .map((p) => `${(50 + p.x * 52).toFixed(1)},${(50 - p.y * 40).toFixed(1)}`)
        .join(" L ") +
      " Z";
    return d;
  }, [smoothed]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-hand text-xl text-rose-ink">the sketch pad ✏️</p>
        <p className="mt-1 text-sm leading-relaxed text-cocoa-soft">
          Draw <span className="font-semibold text-cocoa">one petal</span> — any shape you like,
          one continuous stroke. We smooth the wobbles, mirror it evenly and bloom it into 3D.
          Every other choice (colour, petals, bouquet) still works with it.
        </p>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row">
        <div ref={wrapRef} className="relative aspect-square w-full max-w-[300px] self-center sm:self-start">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Sketch pad: draw one petal outline with your pointer"
            className="h-full w-full cursor-crosshair touch-none rounded-[1.5rem] border-2 border-blush-deep/25 shadow-card"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
          />
          {!rawPts && (
            <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-hand text-lg text-rose/50">
              draw here ✿
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          {/* live preview of the actual geometry */}
          <div className="flex items-center gap-4 rounded-[1.5rem] bg-blush-soft/40 p-4">
            {preview ? (
              <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0" aria-hidden="true">
                {Array.from({ length: petalCount }).map((_, i) => (
                  <path
                    key={i}
                    d={preview}
                    fill={color}
                    fillOpacity={i % 2 === 0 ? 0.95 : 0.75}
                    transform={`rotate(${(i / petalCount) * 360} 50 50)`}
                  />
                ))}
                <circle cx="50" cy="50" r="9" fill={centerColor} />
              </svg>
            ) : (
              <div
                aria-hidden="true"
                className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-blush-deep/40 text-3xl"
              >
                ✿
              </div>
            )}
            <div>
              <p className="font-hand text-lg text-rose-ink">your flower will bloom like this</p>
              <p className="text-xs text-cocoa-soft">
                {smoothed
                  ? `${petalCount} of your petals around a ${centerColor === "#F0D5A8" ? "butter yellow" : "chosen"} centre`
                  : "finish a stroke to see the preview"}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={symmetric}
            onClick={() => setSymmetric((s) => !s)}
            className="flex w-fit items-center gap-3 rounded-full border-2 px-3.5 py-2 text-sm font-semibold transition-all duration-300"
            style={{
              borderColor: symmetric ? "#D8849C" : "rgba(201,154,166,0.3)",
              background: symmetric ? "#FBE9EE" : "rgba(255,255,255,0.6)",
              color: symmetric ? "#5C4044" : "#8A6A60",
            }}
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-300"
              style={{ background: symmetric ? "#D8849C" : "rgba(201,154,166,0.3)" }}
            >
              <span
                className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300"
                style={{ transform: symmetric ? "translateX(1rem)" : "none" }}
              />
            </span>
            Mirror it evenly
          </button>

          <p aria-live="polite" className="min-h-5 text-sm font-semibold text-rose-ink">
            {hint}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!smoothed}
              style={smoothed ? undefined : { opacity: 0.45, cursor: "not-allowed" }}
              onClick={() => smoothed && onApply(quantizePetal(smoothed))}
            >
              ✨ Make it 3D
            </button>
            <button
              type="button"
              className="btn btn-sm rounded-full px-5 py-2.5 text-cocoa-soft transition-colors hover:text-rose-ink"
              onClick={() => {
                setRawPts(null);
                setSmoothed(null);
                setHint("");
              }}
            >
              ↺ Clear
            </button>
            <button
              type="button"
              className="btn btn-sm rounded-full px-5 py-2.5 text-cocoa-soft transition-colors hover:text-rose-ink"
              onClick={onCancel}
            >
              ← Back to options
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
