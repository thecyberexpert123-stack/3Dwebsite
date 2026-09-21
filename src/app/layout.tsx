import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { HeartTrail } from "@/components/HeartTrail";
import { GlassDefs } from "@/components/GlassDefs";
import { site } from "@/data/site";
import { faqs } from "@/data/faqs";
import { PHONE_DISPLAY } from "@/lib/whatsapp";

/* Brand type: elegant script (logo & select headings).
   Self-hosted OFL fonts (via Fontsource) so builds need no network access. */
const parisienne = localFont({
  src: "../fonts/parisienne-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-parisienne",
  display: "swap",
  adjustFontFallback: "Arial",
});

/* Handwritten annotations */
const caveat = localFont({
  src: "../fonts/caveat-latin-wght-normal.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-caveat",
  display: "swap",
  adjustFontFallback: "Arial",
});

/* Body type: clean rounded sans */
const quicksand = localFont({
  src: "../fonts/quicksand-latin-wght-normal.woff2",
  weight: "300 700",
  style: "normal",
  variable: "--font-quicksand",
  display: "swap",
  adjustFontFallback: "Arial",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: site.metaTitle,
  description: site.metaDescription,
  keywords: [
    "handmade crochet",
    "crochet flowers",
    "crochet bouquet",
    "crochet keychain",
    "crochet charms",
    "crochet accessories",
    "crochet bandana",
    "custom crochet",
    "personalized crochet gifts",
    "Whimlet",
  ],
  openGraph: {
    title: site.metaTitle,
    description: site.metaDescription,
    type: "website",
    url: "/",
    siteName: "Whimlet",
    images: [
      {
        url: "/images/hero-fallback.jpg",
        width: 1408,
        height: 768,
        alt: "Hand-crocheted blush pink and cream yarn flower bouquet with pastel yarn balls, a crochet hook and a little gift box",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.metaTitle,
    description: site.metaDescription,
    images: ["/images/hero-fallback.jpg"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FFF6F8",
  width: "device-width",
  initialScale: 1,
};

/* Structured data — facts only: brand, description, contact number. */
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Whimlet",
    description: site.metaDescription,
    url: siteUrl,
    telephone: PHONE_DISPLAY,
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${parisienne.variable} ${caveat.variable} ${quicksand.variable}`}
    >
      <body className="gingham min-h-screen">
        {children}
        <HeartTrail />
        <GlassDefs />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
