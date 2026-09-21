"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { productCategoryLabel, type Product } from "@/data/products";
import { waLink, waMessages } from "@/lib/whatsapp";
import { HeartDoodle, SparkleDoodle, WhatsAppGlyph } from "./Decorations";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import { PALETTE } from "@/lib/palette";

const ProductViewer3D = dynamic(() => import("./three/ProductViewer3D").then(m => ({ default: m.ProductViewer3D })), {
  ssr: false,
  loading: () => <div className="aspect-square animate-pulse rounded-[1.5rem] bg-blush-soft" />,
});

function getProduct3DType(category: string): "bouquet" | "charm" | "accessory" | "flower" | "gift" {
  if (category.includes("bouquet") || category.includes("flower")) return "bouquet";
  if (category.includes("charm") || category.includes("keychain")) return "charm";
  if (category.includes("accessory") || category.includes("bandana") || category.includes("hair")) return "accessory";
  if (category.includes("gift")) return "gift";
  return "flower";
}

function getProductColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("blush") || lower.includes("pink")) return PALETTE.blush;
  if (lower.includes("lavender") || lower.includes("purple")) return PALETTE.lavender;
  if (lower.includes("sage") || lower.includes("green")) return PALETTE.sage;
  if (lower.includes("cream") || lower.includes("white")) return PALETTE.cream;
  if (lower.includes("strawberry") || lower.includes("red")) return PALETTE.strawberry;
  if (lower.includes("sunflower") || lower.includes("yellow")) return PALETTE.butter;
  return PALETTE.rose;
}

export function ProductModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const [viewMode, setViewMode] = useState<"photo" | "3d">("photo");

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    lockScroll();
    closeRef.current?.focus();
    setViewMode("photo");
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [product, onClose]);

  if (!product) return null;

  const product3DType = getProduct3DType(product.category);
  const productColor = getProductColor(product.name);

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <button
            type="button"
            aria-label="Close product details"
            onClick={onClose}
            className="absolute inset-0 bg-bark/50 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            initial={{ y: 80, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            data-lenis-prevent
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-whitish shadow-[0_32px_80px_-16px_rgba(74,50,56,0.4)] sm:max-h-[88vh] sm:flex-row"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-cocoa shadow-card backdrop-blur-sm transition-all hover:scale-105 hover:bg-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* Left: Visual — photo or 3D */}
            <div className="relative flex w-full flex-col sm:w-[52%]">
              {/* Toggle */}
              <div className="absolute left-4 top-4 z-10 flex gap-1.5 rounded-full bg-white/85 p-1 shadow-card backdrop-blur-md">
                <button
                  onClick={() => setViewMode("photo")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    viewMode === "photo" ? "bg-cocoa text-white shadow-sm" : "text-cocoa-soft hover:text-cocoa"
                  }`}
                >
                  Photo
                </button>
                <button
                  onClick={() => setViewMode("3d")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    viewMode === "3d" ? "bg-cocoa text-white shadow-sm" : "text-cocoa-soft hover:text-cocoa"
                  }`}
                >
                  3D View
                </button>
              </div>

              <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-auto sm:h-full sm:min-h-[520px]">
                <AnimatePresence mode="wait">
                  {viewMode === "photo" ? (
                    <motion.div
                      key="photo"
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0"
                    >
                      <motion.div
                        layoutId={reduce ? undefined : `product-image-${product.id}`}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="relative h-full w-full"
                      >
                        <Image
                          src={product.image}
                          alt={product.alt}
                          fill
                          sizes="(min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                          priority
                        />
                      </motion.div>
                      <span className="chip chip-white absolute bottom-4 left-4 shadow-soft">made to order • handmade</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="3d"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0"
                    >
                      <ProductViewer3D productType={product3DType} color={productColor} className="h-full w-full" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right: Details */}
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 sm:p-8">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-rose-ink">
                    {productCategoryLabel(product.category)}
                  </p>
                  <span className="h-1 w-1 rounded-full bg-blush-deep" />
                  <p className="flex items-center gap-1 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-sage-deep">
                    <HeartDoodle className="h-3 w-3" /> handmade
                  </p>
                </div>
                <h3 id="product-modal-title" className="mt-2 text-2xl font-bold leading-tight text-cocoa md:text-[2rem]">
                  {product.name}
                </h3>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <HeartDoodle key={i} className="h-3.5 w-3.5 text-rose" />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-cocoa-soft">loved by many • made to order</span>
                </div>
              </div>

              <p className="text-pretty leading-relaxed text-cocoa-soft">{product.description}</p>

              {product.customizable && (
                <div className="rounded-[1.25rem] bg-gradient-to-br from-blush-soft/60 to-lavender/40 p-4">
                  <p className="flex items-start gap-2.5 text-sm font-medium leading-relaxed text-cocoa">
                    <SparkleDoodle className="mt-0.5 h-4 w-4 shrink-0 text-rose-ink" />
                    <span>
                      <strong className="font-bold">Fully customisable</strong> — colours, sizes, little details, even a handwritten note. 
                      We make it exactly how you imagine it.
                    </span>
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-blush/30 bg-ivory/80 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-cocoa">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blush text-xs">✿</span>
                  Craftsmanship details
                </h4>
                <ul className="mt-2.5 space-y-1.5 text-sm text-cocoa-soft">
                  <li className="flex gap-2"><span className="text-rose">•</span> 100% handmade, one stitch at a time</li>
                  <li className="flex gap-2"><span className="text-rose">•</span> Premium soft yarn, gentle & durable</li>
                  <li className="flex gap-2"><span className="text-rose">•</span> Made to order — no mass production</li>
                  <li className="flex gap-2"><span className="text-rose">•</span> Comes in a cute gift-ready wrap</li>
                </ul>
              </div>

              <hr className="stitch-hr" />

              <div className="flex flex-col gap-3">
                <a
                  href={waLink(waMessages.product(product.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-md w-full text-[0.95rem]"
                >
                  <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
                  Ask About This Piece
                </a>
                <a href="#custom" onClick={onClose} className="btn btn-outline btn-md w-full">
                  <HeartDoodle className="h-4 w-4" /> Request Custom Version
                </a>
                <a href="#studio" onClick={onClose} className="btn btn-glass btn-md w-full">
                  <SparkleDoodle className="h-4 w-4" /> Try in Design Studio
                </a>
              </div>

              <p className="text-center text-xs font-medium text-cocoa-soft">
                Handmade to order • Usually 3-5 days • WhatsApp enquiries • Ships with love
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
