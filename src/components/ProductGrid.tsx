"use client";

import { useState } from "react";
import Image from "next/image";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { PRODUCT_CATEGORIES, productCategoryLabel, products, type Product } from "@/data/products";
import { waLink, waMessages } from "@/lib/whatsapp";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { TiltCard } from "./TiltCard";
import { ProductModal } from "./ProductModal";
import { HeartDoodle, SparkleDoodle } from "./Decorations";

/**
 * Product Grid 2.0 — CINEMATIC PRODUCT SHOWCASE
 * 
 * Research from best e-commerce 3D sites:
 * - Cartier: one room per product, museum-like
 * - Oryzo: inertial 3D product render with weight
 * - Apple: scroll-driven canvas sequences
 * 
 * Upgrades:
 * - Depth layers: image, shadow, highlight, frame
 * - 3D hover with parallax and light response
 * - Quick 3D preview on hover (for high tier)
 * - Better filtering with spring animations
 * - Each card feels like a little window into the workshop
 */

export function ProductGrid() {
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Product | null>(null);

  const shown = filter === "all" ? products : products.filter((p) => p.category === filter);

  return (
    <LayoutGroup id="shop">
    <section id="shop" className="polka scallop-bottom relative py-24 md:py-32" style={{ "--scallop": "var(--color-cream)" } as React.CSSProperties}>
      {/* Ambient light bloom behind grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[20%] top-[30%] h-[400px] w-[400px] rounded-full bg-lavender/20 blur-[80px]" />
        <div className="absolute right-[15%] top-[60%] h-[500px] w-[500px] rounded-full bg-blush/15 blur-[100px]" />
        <div className="absolute left-[50%] top-[80%] h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-butter/20 blur-[60px]" />
      </div>
      
      <div className="wrap relative">
        <SectionHeading
          eyebrow="the current favourites"
          title="Made To"
          accent="Make You Smile"
          lead="A little shelf of current favourites. Each piece is handmade to order — peek in 3D, then ask about it and we'll make it yours."
        />

        {/* Filter chips with more polish */}
        <Reveal delay={0.1} className="mt-10 flex flex-wrap justify-center gap-2.5">
          {[{ id: "all", label: "All Pieces" }, ...PRODUCT_CATEGORIES].map((c) => {
            const active = filter === c.id;
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                aria-pressed={active}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                className={`relative overflow-hidden rounded-full border px-5 py-2.5 text-sm font-bold transition-all duration-400 ${
                  active
                    ? "border-transparent bg-cocoa text-white shadow-[0_8px_20px_-8px_rgba(74,50,56,0.5)]"
                    : "border-white/80 bg-white/85 text-cocoa-soft shadow-card backdrop-blur-sm hover:bg-white hover:text-rose-ink hover:shadow-soft"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-filter"
                    className="absolute inset-0 bg-cocoa"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative">{c.label}</span>
              </motion.button>
            );
          })}
        </Reveal>

        {/* Grid with staggered 3D entrance */}
        <motion.div
          key={filter}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {shown.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} onOpen={() => setSelected(p)} />
          ))}
        </motion.div>

        <Reveal className="mt-16 text-center">
          <div className="inline-flex flex-col items-center gap-3 rounded-[1.5rem] bg-white/70 px-8 py-6 shadow-card backdrop-blur-md">
            <p className="flex items-center gap-2 font-hand text-[1.35rem] text-rose-ink">
              <SparkleDoodle className="h-5 w-5" /> looking for something you don't see here?
            </p>
            <a href="#custom" className="group inline-flex items-center gap-2 font-semibold text-cocoa transition-colors hover:text-rose-ink">
              <span className="underline decoration-blush-deep decoration-2 underline-offset-4">We'd love to make it custom</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </Reveal>
      </div>

      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </section>
    </LayoutGroup>
  );
}

function ProductCard({
  product,
  index,
  onOpen,
}: {
  product: Product;
  index: number;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Reveal delay={Math.min(index * 0.07, 0.4)} className="h-full">
      <TiltCard className="h-full">
      <motion.article 
        className="group flex h-full flex-col"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Image with depth */}
        <div className="relative">
          {/* Shadow layer */}
          <div className="absolute inset-0 translate-y-2 rounded-[1.75rem] bg-cocoa/10 blur-[12px] transition-all duration-500 group-hover:translate-y-3 group-hover:bg-cocoa/15 group-hover:blur-[16px]" />
          
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            aria-label={`View details for ${product.name} in 3D`}
            className="relative block w-full overflow-hidden rounded-[1.75rem] bg-white shadow-[0_8px_24px_-12px_rgba(74,50,56,0.15),0_2px_8px_-2px_rgba(74,50,56,0.08)] transition-all duration-500 group-hover:shadow-[0_20px_40px_-16px_rgba(74,50,56,0.25),0_4px_12px_-2px_rgba(74,50,56,0.12)]"
          >
            <motion.span
              layoutId={reduce ? undefined : `product-image-${product.id}`}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative block aspect-[4/3] overflow-hidden rounded-[1.75rem]"
            >
              <Image
                src={product.image}
                alt={product.alt}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
              />
              {/* Light sheen that follows hover */}
              <motion.div
                className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(400px circle at ${isHovered ? '60% 20%' : '50% 50%'}, rgba(255,255,255,0.25), transparent 60%)`,
                }}
              />
              {/* Subtle vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-cocoa/10 via-transparent to-transparent opacity-60" />
            </motion.span>
            
            {/* Floating heart with spring */}
            <motion.span 
              className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-rose-ink shadow-[0_4px_12px_rgba(74,50,56,0.15)] backdrop-blur-sm"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: isHovered ? 1 : 0.5, opacity: isHovered ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <HeartDoodle className="h-5 w-5 animate-heartbeat" />
            </motion.span>
            
            {product.customizable && (
              <motion.span 
                className="chip chip-white absolute left-3.5 top-3.5"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <SparkleDoodle className="h-3 w-3" /> customisable
              </motion.span>
            )}
            
            {/* 3D badge */}
            <motion.div
              className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 rounded-full bg-cocoa/85 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white backdrop-blur-md"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: isHovered ? 0 : 10, opacity: isHovered ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lavender" />
              3D view
            </motion.div>
          </button>
        </div>

        <div className="flex flex-1 flex-col px-2 pt-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-rose-ink">
              {productCategoryLabel(product.category)}
            </p>
            <div className="flex gap-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="h-1 w-1 rounded-full bg-blush-deep/60" />
              ))}
            </div>
          </div>
          
          <h3 className="mt-1.5 text-[1.15rem] font-bold leading-tight text-cocoa group-hover:text-rose-ink transition-colors">
            {product.name}
          </h3>
          
          <p className="mt-2 flex-1 text-[0.9rem] leading-relaxed text-cocoa-soft line-clamp-2">
            {product.blurb}
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <div className="flex gap-2">
              <a
                href={waLink(waMessages.product(product.name))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm flex-1 text-[0.85rem]"
              >
                Ask About This
              </a>
              <button 
                type="button" 
                onClick={onOpen} 
                className="btn btn-outline btn-sm px-3"
                aria-label={`View ${product.name} in 3D`}
              >
                3D
              </button>
            </div>
            <button 
              type="button" 
              onClick={onOpen} 
              className="w-full text-center text-xs font-semibold text-cocoa-soft transition-colors hover:text-rose-ink"
            >
              View details & 3D preview →
            </button>
          </div>
        </div>
      </motion.article>
      </TiltCard>
    </Reveal>
  );
}
