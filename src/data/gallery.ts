/**
 * GALLERY — Pinterest-style masonry.
 *
 * ▶ EDIT ME: swap in real photography by replacing files in
 *   /public/images/ and updating items here. Aspect classes create the
 *   masonry rhythm (tall / square / wide).
 *
 * Images marked with source "product" are the AI-generated placeholder
 * product shots; "studio" images are placeholder scene shots.
 */

export type GalleryCategoryId = "flowers" | "keychains" | "accessories" | "custom" | "process";

export const galleryFilters: { id: "all" | GalleryCategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "flowers", label: "Flowers" },
  { id: "keychains", label: "Keychains" },
  { id: "accessories", label: "Accessories" },
  { id: "custom", label: "Custom" },
  { id: "process", label: "Process" },
];

export type GalleryItem = {
  id: string;
  category: GalleryCategoryId;
  src: string;
  alt: string;
  caption: string; // short handwritten-style caption
  aspect: "tall" | "square" | "wide";
};

export const galleryItems: GalleryItem[] = [
  {
    id: "g-bouquet",
    category: "flowers",
    src: "/images/products/bouquet-blush.jpg",
    alt: "Blush pink and cream crochet rose bouquet wrapped with ribbon",
    caption: "the blush rose bouquet",
    aspect: "tall",
  },
  {
    id: "g-strawberry",
    category: "keychains",
    src: "/images/products/charm-strawberry.jpg",
    alt: "Tiny crochet strawberry charm with sage leafy top",
    caption: "a plump little strawberry",
    aspect: "square",
  },
  {
    id: "g-sunflower",
    category: "flowers",
    src: "/images/products/sunflower.jpg",
    alt: "Golden crochet sunflower with sage stem",
    caption: "sunshine, crocheted",
    aspect: "wide",
  },
  {
    id: "g-story-hands",
    category: "process",
    src: "/images/story-hands.jpg",
    alt: "Half-finished blush crochet flower with wooden hook mid-stitch on linen",
    caption: "work in progress",
    aspect: "tall",
  },
  {
    id: "g-daisy",
    category: "keychains",
    src: "/images/products/daisy-keychain.jpg",
    alt: "White crochet daisy keychain with gold clasp",
    caption: "a daisy to go",
    aspect: "wide",
  },
  {
    id: "g-bandana",
    category: "accessories",
    src: "/images/products/bandana-blush.jpg",
    alt: "Folded blush crochet bandana with cream woven pattern",
    caption: "the blush bandana",
    aspect: "square",
  },
  {
    id: "g-gift-set",
    category: "custom",
    src: "/images/products/gift-set.jpg",
    alt: "Gift box of tiny crochet pieces in tissue paper",
    caption: "a box of little joys",
    aspect: "tall",
  },
  {
    id: "g-tulips",
    category: "flowers",
    src: "/images/products/tulips-pair.jpg",
    alt: "Two crochet tulips in blush and cream",
    caption: "tulips, in pairs",
    aspect: "wide",
  },
  {
    id: "g-hairclip",
    category: "accessories",
    src: "/images/products/hairclip-blossom.jpg",
    alt: "Blush crochet blossom hair clip on cream linen",
    caption: "wearable whimsy",
    aspect: "square",
  },
  {
    id: "g-studio",
    category: "custom",
    src: "/images/hero-fallback.jpg",
    alt: "Crochet studio scene with bouquet, yarn balls, hook and gift box",
    caption: "our happy place",
    aspect: "wide",
  },
];
