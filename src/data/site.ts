/** Central site identity + navigation. Edit here to update globally. */

export const site = {
  name: "Whimlet",
  tagline: "Handmade crochet, made with love.",
  closingPhrase: "One stitch at a time.",
  email: "thecyberexpert123@gmail.com",
  metaTitle: "Whimlet | Handmade Crochet Products & Custom Crochet",
  metaDescription:
    "Discover handmade crochet flowers, bouquets, keychains, charms, accessories, bandanas and customizable crochet creations from Whimlet.",
};

export type NavItem = { label: string; href: string };

export const primaryNav: NavItem[] = [
  { label: "Home", href: "#home" },
  { label: "Shop", href: "#shop" },
  { label: "Custom", href: "#custom" },
  { label: "Our Story", href: "#story" },
  { label: "Gallery", href: "#gallery" },
];

export const footerNav: NavItem[] = [
  { label: "Shop", href: "#shop" },
  { label: "Custom Orders", href: "#custom" },
  { label: "3D Design Studio", href: "/studio" },
  { label: "Whimlet Maker", href: "/maker" },
  { label: "Our Story", href: "#story" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

/**
 * Social handles are intentionally unlinked placeholders — no real
 * usernames/URLs exist yet. Replace the `href` values when the
 * accounts are created.
 */
export const socialPlaceholders = [
  { label: "Instagram", href: "" },
  { label: "Pinterest", href: "" },
  { label: "Facebook", href: "" },
];
