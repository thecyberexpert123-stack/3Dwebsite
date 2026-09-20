/**
 * FAQ — copy is kept honest: no invented delivery times, shipping policies
 * or returns policies (none were provided by the business). Timing and
 * delivery details are answered with "we'll confirm when you enquire".
 */

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "Do you accept custom orders?",
    a: "Yes — custom pieces are the heart of Whimlet! Tell us what you're imagining and we'll crochet it specially for you.",
  },
  {
    q: "How do custom orders work?",
    a: "You share your idea (through the custom order form or a WhatsApp message), we chat about colours, size and details, confirm the design with you, and then crochet your piece by hand. We'll keep the details in one WhatsApp chat so nothing gets lost.",
  },
  {
    q: "Can I choose the colours?",
    a: "Absolutely. Pick from our favourite yarn shades or describe any colour you love — if the yarn exists, we'll find it.",
  },
  {
    q: "Can I request a specific design?",
    a: "Yes! A favourite flower, a character, a theme, a matching set — if it can be crocheted, we'd love to try. Share your idea and any reference photos on WhatsApp.",
  },
  {
    q: "How long does a custom order take?",
    a: "Every piece is handmade to order, so the time depends on the size and detail of the design. We'll share an honest estimate with you before you confirm anything.",
  },
  {
    q: "How do I enquire about a product?",
    a: "Tap “Ask About This Piece” on any product — it opens a WhatsApp chat with the product name prefilled, so we know exactly what you're asking about.",
  },
  {
    q: "How can I contact Whimlet?",
    a: "WhatsApp is the fastest way to reach us — chat with Whimlet or call +91 74397 48279.",
  },
  {
    q: "Can I order crochet products as gifts?",
    a: "Of course — Whimlet pieces make lovely gifts. Tell us the occasion and the person, and we can suggest (or customise) something just right.",
  },
];
