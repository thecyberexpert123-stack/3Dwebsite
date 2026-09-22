import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { HeartTrail } from "@/components/HeartTrail";
import { EngineProvider } from "@/lib/engine/EngineProvider";
import { GlassDefs } from "@/components/GlassDefs";
import { site } from "@/data/site";
import { faqs } from "@/data/faqs";
import { PHONE_DISPLAY } from "@/lib/whatsapp";
import { absoluteUrl, withBasePath } from "@/lib/paths";

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
// The metadata API resolves relative URLs against metadataBase but does not
// add `basePath` (relevant for the GitHub Pages build), so prefix them here.
const heroImage = withBasePath("/images/hero-fallback.jpg");

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
    url: withBasePath("/"),
    siteName: "Whimlet",
    images: [
      {
        url: heroImage,
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
    images: [heroImage],
  },
  robots: { index: true, follow: true },
  // Android / PWA surface. The manifest route (src/app/manifest.ts) is
  // basePath-aware; Next adds the <link rel="manifest"> from this field.
  manifest: withBasePath("/manifest.webmanifest"),
  applicationName: "Whimlet",
  appleWebApp: { capable: true, title: "Whimlet", statusBarStyle: "default" },
  icons: {
    icon: [{ url: withBasePath("/icon.svg"), type: "image/svg+xml" }, { url: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" }],
    apple: [{ url: withBasePath("/icons/apple-touch-icon.png"), sizes: "180x180" }],
  },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: "#FFF6F8",
  width: "device-width",
  initialScale: 1,
  // Android/iOS: draw under the status/gesture bars (safe-area insets are
  // applied in globals.css) and keep the layout stable when the keyboard opens
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

/* Structured data — facts only: brand, description, contact number. */
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Whimlet",
    description: site.metaDescription,
    url: absoluteUrl("/"),
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
      <head>
        {/* GitHub Pages cannot send HTTP security headers, so ship the policy
            as reachable as a <meta> tag. A meta CSP is a weaker guarantee
            than the header (no frame-ancestors / report-uri) but still stops
            third-party script injection and mixed content — the meaningful
            XSS surface for a fully static site that embeds zero third-party
            scripts. `connect-src` https: + wss: already admits Supabase
            (REST/Realtime) for the upcoming sign-in work. */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={
            "base-uri 'self'; object-src 'none'; form-action 'self' https://wa.me https://api.whatsapp.com; " +
            "img-src * data: blob:; frame-src 'none'; " +
            "connect-src 'self' https: wss:; " +
            "default-src 'self' 'unsafe-inline' 'unsafe-eval'"
          }
        />
        {/* GitHub Pages cannot send the Referrer-Policy header either. */}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body className="gingham min-h-screen">
        {children}
        <HeartTrail />
        <GlassDefs />
        <EngineProvider />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
