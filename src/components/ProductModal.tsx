"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { productCategoryLabel, type Product } from "@/data/products";
import { waLink, waMessages } from "@/lib/whatsapp";
import { HeartDoodle, SparkleDoodle, WhatsAppGlyph } from "./Decorations";

/**
 * Product detail dialog: image, story, customization notes and a WhatsApp
 * enquiry CTA with the product name prefilled. Focus, Escape, scroll lock.
 */
export function ProductModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  // Escape to close + focus the close button on open + body scroll lock
  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [product, onClose]);

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* backdrop */}
          <button
            type="button"
            aria-label="Close product details"
            onClick={onClose}
            className="absolute inset-0 bg-bark/40 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative grid max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-whitish shadow-lift sm:grid-cols-2 sm:rounded-[2rem]"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-cocoa shadow-card transition-transform hover:scale-105"
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* image — shared element: flies in from the card that was tapped */}
            <motion.div
              layoutId={reduce ? undefined : `product-image-${product.id}`}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-[4/3] overflow-hidden rounded-t-[2rem] sm:aspect-auto sm:min-h-[440px] sm:rounded-l-[2rem] sm:rounded-tr-none"
            >
              <Image
                src={product.image}
                alt={product.alt}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
                priority
              />
              <span className="chip chip-white absolute left-4 top-4">made to order</span>
            </motion.div>

            {/* details */}
            <div className="flex flex-col gap-4 p-6 sm:p-8 md:justify-center">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-rose-ink">
                  {productCategoryLabel(product.category)}
                </p>
                <h3 id="product-modal-title" className="mt-1.5 text-2xl font-bold text-cocoa md:text-3xl">
                  {product.name}
                </h3>
              </div>

              <p className="text-pretty leading-relaxed text-cocoa-soft">{product.description}</p>

              {product.customizable && (
                <p className="flex items-start gap-2.5 rounded-2xl bg-blush-soft/50 p-3.5 text-sm font-medium text-cocoa">
                  <SparkleDoodle className="mt-0.5 h-4 w-4 shrink-0 text-rose-ink" />
                  Customisable — colours, sizes and little details can be
                  tailored to you. Just ask!
                </p>
              )}

              <hr className="stitch-hr" />

              <div className="flex flex-col gap-2.5">
                <a
                  href={waLink(waMessages.product(product.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-md w-full"
                >
                  <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
                  Ask About This Piece
                </a>
                <a href="#custom" onClick={onClose} className="btn btn-outline btn-md w-full">
                  <HeartDoodle className="h-4 w-4" /> Request a Custom Version
                </a>
              </div>

              <p className="text-center text-xs text-cocoa-soft">
                Handmade to order · enquiries over WhatsApp
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
