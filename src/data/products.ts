/**
 * FEATURED PRODUCTS — the shop grid.
 *
 * ▶ EDIT ME: add/remove/edit products here; the grid, modal, gallery and
 *   WhatsApp CTAs all read from this file.
 *
 * Honesty notes (deliberate):
 * - No prices, stock levels or specifications — none were provided by the
 *   business. Enquiries happen over WhatsApp.
 * - `image` files are AI-generated placeholder product shots used until real
 *   photography is available. Replace the files in /public/images/products/
 *   (keep the filenames, or update the paths here).
 */

export const PRODUCT_CATEGORIES = [
  { id: "flowers", label: "Flowers & Bouquets" },
  { id: "keychains", label: "Keychains & Charms" },
  { id: "accessories", label: "Accessories" },
  { id: "bandanas", label: "Bandanas" },
  { id: "custom", label: "Custom Creations" },
] as const;

export type ProductCategoryId = (typeof PRODUCT_CATEGORIES)[number]["id"];

export function productCategoryLabel(id: string): string {
  return PRODUCT_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export type Product = {
  id: string;
  name: string;
  category: ProductCategoryId;
  blurb: string;
  description: string;
  image: string;
  alt: string;
  customizable: boolean;
  /** Every Whimlet piece is handmade to order — never mass-produced. */
  madeToOrder: true;
};

export const products: Product[] = [
  {
    id: "blush-rose-bouquet",
    name: "Blush Rose Bouquet",
    category: "flowers",
    blurb: "A soft bunch of crochet roses in blush and cream, tied with a ribbon.",
    description:
      "Hand-crocheted roses in blush, dusty rose and cream, finished with sage leaves and wrapped ready to gift. A bouquet that never wilts — lovely for anniversaries, birthdays, or just because.",
    image: "/images/products/bouquet-blush.jpg",
    alt: "Hand-crocheted bouquet of blush pink and cream yarn roses wrapped in cream paper and tied with a pink ribbon",
    customizable: true,
    madeToOrder: true,
  },
  {
    id: "tulip-duo",
    name: "Tulip Duo",
    category: "flowers",
    blurb: "Two sweet crochet tulips in blush and cream with sage stems.",
    description:
      "A pair of hand-crocheted tulips — one blush, one cream — with soft sage stems and leaves. Sweet on a desk, lovelier as a pair, and happiest as a little gift.",
    image: "/images/products/tulips-pair.jpg",
    alt: "Two hand-crocheted yarn tulips, one blush pink and one cream, with sage green stems",
    customizable: true,
    madeToOrder: true,
  },
  {
    id: "daisy-drop-keychain",
    name: "Daisy Drop Keychain",
    category: "keychains",
    blurb: "A tiny crochet daisy on a gold clasp — clip it anywhere joy is needed.",
    description:
      "A classic crochet daisy with a soft yellow centre and a sage leaf, attached to a sturdy clasp. Clip it onto keys, bags or pouches for an everyday sprinkle of cute.",
    image: "/images/products/daisy-keychain.jpg",
    alt: "Hand-crocheted white daisy keychain with a yellow centre and sage leaf on a gold clasp",
    customizable: true,
    madeToOrder: true,
  },
  {
    id: "strawberry-charm",
    name: "Strawberry Charm",
    category: "keychains",
    blurb: "A plump little strawberry with a leafy top — small enough for any bag.",
    description:
      "A tiny hand-crocheted strawberry with a sage leafy crown, finished with a clasp. A sweet little charm for keys, zips or gift toppers.",
    image: "/images/products/charm-strawberry.jpg",
    alt: "Tiny hand-crocheted strawberry charm with a sage green leafy top and gold clasp",
    customizable: true,
    madeToOrder: true,
  },
  {
    id: "blossom-hair-clip",
    name: "Blossom Hair Clip",
    category: "accessories",
    blurb: "A five-petal crochet blossom on a slim gold clip.",
    description:
      "A five-petal crocheted blossom in blush with a cream centre and a little sage leaf, set on a slim gold clip. Wearable whimsy for everyday hair days.",
    image: "/images/products/hairclip-blossom.jpg",
    alt: "Hand-crocheted blush pink five-petal flower hair clip with a cream centre on a gold clip",
    customizable: true,
    madeToOrder: true,
  },
  {
    id: "blush-bandana",
    name: "Blush Bandana",
    category: "bandanas",
    blurb: "A soft crochet bandana with a woven pattern and scalloped edge.",
    description:
      "A hand-crocheted bandana in soft blush with a delicate woven pattern, a scalloped edge and a ribbon tie. Cute, airy and made to be worn all summer.",
    image: "/images/products/bandana-blush.jpg",
    alt: "Folded hand-crocheted blush pink bandana with a cream woven pattern and scalloped edge",
    customizable: true,
    madeToOrder: true,
  },
  {
    id: "little-joys-gift-box",
    name: "Little Joys Gift Box",
    category: "custom",
    blurb: "A curated set of tiny crochet pieces tucked into tissue paper.",
    description:
      "A little gift box of tiny hand-crocheted pieces — a rose, a daisy, a heart and a leaf charm — nestled in tissue paper. Tell us the occasion and colours, and we'll curate it specially.",
    image: "/images/products/gift-set.jpg",
    alt: "Open kraft gift box with tiny crocheted rose, daisy, heart and leaf charm in cream tissue paper",
    customizable: true,
    madeToOrder: true,
  },
  {
    id: "sunny-sunflower",
    name: "Sunny Sunflower",
    category: "flowers",
    blurb: "A golden crochet sunflower with one sage leaf.",
    description:
      "A hand-crocheted sunflower with warm golden petals, a softly textured brown centre and a sage stem. A little ball of sunshine that blooms all year.",
    image: "/images/products/sunflower.jpg",
    alt: "Hand-crocheted golden sunflower with a brown centre and sage green stem",
    customizable: true,
    madeToOrder: true,
  },
];
