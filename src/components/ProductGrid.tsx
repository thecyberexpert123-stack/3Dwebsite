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
import { HeartDoodle } from "./Decorations";

/**
 * Featured products — "Made To Make You Smile".
 * No prices, no stock counters: every card leads to a WhatsApp enquiry
 * with the product name prefilled.
 */
export function ProductGrid() {
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Product | null>(null);

  const shown = filter === "all" ? products : products.filter((p) => p.category === filter);

  return (
    <LayoutGroup id="shop">
    <section id="shop" className="polka scallop-bottom relative py-20 md:py-28" style={{ "--scallop": "var(--color-cream)" } as React.CSSProperties}>
      <div className="wrap">
        <SectionHeading
          eyebrow="the current favourites"
          title="Made To"
          accent="Make You Smile"
          lead="A little shelf of current favourites. Every piece is handmade to order — ask about any of them and we'll make it yours."
        />

        {/* filter chips */}
        <Reveal delay={0.1} className="mt-10 flex flex-wrap justify-center gap-2.5">
          {[{ id: "all", label: "All" }, ...PRODUCT_CATEGORIES].map((c) => {
            const active = filter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                  active
                    ? "border-transparent bg-blush text-cocoa shadow-clay-sm"
                    : "border-white bg-white/80 text-cocoa-soft shadow-card hover:-translate-y-0.5 hover:text-rose-ink"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </Reveal>

        {/* grid */}
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {shown.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} onOpen={() => setSelected(p)} />
          ))}
        </motion.div>

        <Reveal className="mt-12 text-center">
          <p className="font-hand text-xl text-rose-ink">
            looking for something you don't see here?
          </p>
          <a href="#custom" className="mt-1 inline-block font-semibold text-cocoa underline decoration-blush-deep decoration-2 underline-offset-4 transition-colors hover:text-rose-ink">
            We'd love to make it custom →
          </a>
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
  return (
    <Reveal delay={Math.min(index * 0.06, 0.3)} className="h-full">
      <TiltCard className="h-full">
      <article className="group flex h-full flex-col">
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-label={`View details for ${product.name}`}
          className="relative block w-full overflow-hidden rounded-[1.75rem] shadow-card transition-shadow duration-500 group-hover:shadow-lift"
        >
          <motion.span
            layoutId={reduce ? undefined : `product-image-${product.id}`}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative block aspect-[4/3] overflow-hidden rounded-[1.75rem]"
          >
            <Image
              src={product.image}
              alt={product.alt}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          </motion.span>
          {/* tiny heart appears on hover */}
          <span className="absolute right-3.5 top-3.5 flex h-9 w-9 scale-50 items-center justify-center rounded-full bg-white/85 text-rose-ink opacity-0 shadow-card transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
            <HeartDoodle className="h-5 w-5 animate-heartbeat" />
          </span>
          {product.customizable && (
            <span className="chip chip-white absolute left-3.5 top-3.5">customisable</span>
          )}
        </button>

        <div className="flex flex-1 flex-col px-1.5 pt-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-rose-ink">
            {productCategoryLabel(product.category)}
          </p>
          <h3 className="mt-1 text-lg font-bold text-cocoa">{product.name}</h3>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-cocoa-soft">{product.blurb}</p>

          <div className="mt-4 flex flex-col gap-2 pb-1 sm:flex-row">
            <a
              href={waLink(waMessages.product(product.name))}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm flex-1"
            >
              Ask About This
            </a>
            <button type="button" onClick={onOpen} className="btn btn-outline btn-sm">
              View Details
            </button>
          </div>
        </div>
      </article>
      </TiltCard>
    </Reveal>
  );
}
