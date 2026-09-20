/**
 * OCCASIONS — "why customers order" cards.
 * Images reuse existing photography; swap when dedicated shots exist.
 */

export type Occasion = {
  id: string;
  title: string;
  line: string;
  image: string;
  alt: string;
};

export const occasions: Occasion[] = [
  {
    id: "birthdays",
    title: "Birthday Gifts",
    line: "Make their day with something made just for them.",
    image: "/images/products/gift-set.jpg",
    alt: "Gift box of tiny crochet pieces",
  },
  {
    id: "anniversaries",
    title: "Anniversaries",
    line: "Flowers that never wilt.",
    image: "/images/products/bouquet-blush.jpg",
    alt: "Blush crochet rose bouquet",
  },
  {
    id: "friendship",
    title: "Friendship Gifts",
    line: "Tiny things that say “thinking of you”.",
    image: "/images/products/daisy-keychain.jpg",
    alt: "Crochet daisy keychain",
  },
  {
    id: "special",
    title: "Special Occasions",
    line: "One-of-a-kind pieces for one-of-a-kind days.",
    image: "/images/products/tulips-pair.jpg",
    alt: "Two crochet tulips in blush and cream",
  },
  {
    id: "everyday",
    title: "Everyday Little Joys",
    line: "Because ordinary days deserve cute too.",
    image: "/images/products/hairclip-blossom.jpg",
    alt: "Crochet blossom hair clip",
  },
  {
    id: "personalized",
    title: "Personalized Gifts",
    line: "Their favourite colour, their favourite thing.",
    image: "/images/products/charm-strawberry.jpg",
    alt: "Tiny crochet strawberry charm",
  },
];
