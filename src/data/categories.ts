/**
 * CATEGORY SHOWCASE — the editorial floating cards ("Find Your Little Something").
 * Images reuse product photography; swap paths when dedicated shots exist.
 */

export type ShowcaseCategory = {
  id: string;
  title: string;
  note: string; // handwritten label
  description: string;
  image: string;
  alt: string;
};

export const showcaseCategories: ShowcaseCategory[] = [
  {
    id: "flowers",
    title: "Flowers & Bouquets",
    note: "so soft",
    description: "Roses, tulips and sunflowers that never wilt.",
    image: "/images/products/bouquet-blush.jpg",
    alt: "Crochet flower bouquet in blush pink and cream",
  },
  {
    id: "keychains",
    title: "Keychains & Charms",
    note: "tiny & sweet",
    description: "Little clips of joy for keys and bags.",
    image: "/images/products/daisy-keychain.jpg",
    alt: "Crochet daisy keychain with gold clasp",
  },
  {
    id: "accessories",
    title: "Accessories",
    note: "wearable whimsy",
    description: "Blossoms and clips made to be worn.",
    image: "/images/products/hairclip-blossom.jpg",
    alt: "Crochet blossom hair clip",
  },
  {
    id: "bandanas",
    title: "Bandanas",
    note: "for sunny days",
    description: "Soft, airy and hand-crocheted to tie on.",
    image: "/images/products/bandana-blush.jpg",
    alt: "Folded blush crochet bandana with woven pattern",
  },
  {
    id: "custom",
    title: "Custom Creations",
    note: "your idea, our hooks",
    description: "Dreamt by you, crocheted by us.",
    image: "/images/products/gift-set.jpg",
    alt: "Gift box of tiny custom crochet pieces",
  },
];
