/**
 * Whimlet yarn palette — shared across 2D and 3D, no THREE dependency
 * So it can be imported in non-3D components without pulling THREE into bundle
 */
export const PALETTE = {
  blush: "#F9C6D3",
  blushDeep: "#F3A8BF",
  cream: "#FFF1E6",
  rose: "#E07A9A",
  dusty: "#D16A7C",
  white: "#FFFBFC",
  lavender: "#DCCCF5",
  lavenderDeep: "#B89BE6",
  sage: "#B7D8C4",
  sageDeep: "#7FAE92",
  mint: "#D4F1EA",
  sky: "#D8ECFB",
  butter: "#FFE9A8",
  peach: "#FFD4C2",
  wood: "#C9A27E",
  ivory: "#FFF6F8",
  strawberry: "#F07C8C",
  gold: "#E7C77A",
  sun: "#FFE9A8",
} as const;

export type PaletteColor = keyof typeof PALETTE;
