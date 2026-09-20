/**
 * Whimlet WhatsApp helpers — the primary conversion channel.
 * All CTAs on the site route through here with context-specific
 * prefilled messages.
 */

export const WHATSAPP_NUMBER = "917439748279";
export const PHONE_DISPLAY = "+91 74397 48279";
export const PHONE_TEL = "+917439748279";

/** Build a wa.me deep link with a URL-encoded prefilled message. */
export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const waMessages = {
  general: "Hi Whimlet! I would like to enquire about a crochet product.",
  order: "Hi Whimlet! I would like to place an order.",
  custom: "Hi Whimlet! I would like to discuss a custom crochet order.",
  product: (name: string) =>
    `Hi Whimlet! I'm interested in ${name}. Could you please share more details?`,
  colourCustom: (colour: string) =>
    `Hi Whimlet! I'd love a custom crochet piece in ${colour}. Could you share more details?`,
};

/** Shape of the custom-order wizard state (src/components/CustomOrderExperience). */
export type CustomEnquiry = {
  type: string;
  vibes: string[];
  idea: string;
  extra: string;
  name: string;
  phone: string;
  email: string;
};

/** Compose the custom-order wizard answers into one WhatsApp message. */
export function buildCustomMessage(e: CustomEnquiry): string {
  const lines: string[] = [
    "Hi Whimlet! I'd love to place a custom order.",
    "",
    `• Looking for: ${e.type}`,
  ];
  if (e.vibes.length > 0) lines.push(`• Vibe: ${e.vibes.join(", ")}`);
  lines.push(`• My idea: ${e.idea.trim()}`);
  if (e.extra.trim()) lines.push(`• Anything else: ${e.extra.trim()}`);
  lines.push(`• Name: ${e.name.trim()}`);
  if (e.phone.trim()) lines.push(`• Phone: ${e.phone.trim()}`);
  if (e.email.trim()) lines.push(`• Email: ${e.email.trim()}`);
  return lines.join("\n");
}
