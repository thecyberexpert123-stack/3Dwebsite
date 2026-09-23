import type { Metadata } from "next";
import { LegalPage, H2, P, UL, LI } from "@/components/LegalPage";
import { absoluteUrl } from "@/lib/paths";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Terms of Service | Whimlet",
  description:
    "The terms that apply when you browse Whimlet, enquire, place a handmade order, or use the design tools and your account.",
  alternates: { canonical: absoluteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Terms of Service"
      title="The way we work together"
      updated="23 September 2026"
      intro={
        <P>
          These terms apply when you browse Whimlet, enquire or order, or use the design
          tools and your account. By using the site or placing an order you agree to them.
          If something is unclear, just ask — we would rather chat than have you guess.
        </P>
      }
    >
      <H2>What Whimlet is</H2>
      <P>
        Whimlet ({site.name}) is an independent handmade-crochet business. This website is
        our showcase and our workshop — you can browse pieces, design your own in 3D, and
        start an order. It is not an automated shop: there is no checkout, and nothing is
        charged on the website itself.
      </P>

      <H2>Orders & enquiries</H2>
      <UL>
        <LI>Every order begins as a conversation on WhatsApp (or by phone), started from the “Ask about this piece” or “Order now” buttons.</LI>
        <LI>Price, colours, size and details are confirmed with you in that chat <em>before</em> anything is made.</LI>
        <LI>Nothing is binding until we both confirm the order in writing in the chat.</LI>
      </UL>

      <H2>Custom orders</H2>
      <UL>
        <LI>You share your idea — and any reference photos — and we discuss colours, size and details.</LI>
        <LI>We confirm the design with you and give you an honest timeline before you commit. Every piece is handmade to order, so time depends on the piece.</LI>
        <LI>Since each piece is made by hand, small variations in colour, stitch and shaping are part of the charm — your piece will not be a factory clone.</LI>
      </UL>

      <H2>Prices & payment</H2>
      <P>
        Prices are quoted in our chat. Because we take no payments on the website, the
        payment method and any deposit or balance arrangements are agreed between us in the
        chat and handled there, not through this site.
      </P>

      <H2>Delivery</H2>
      <P>
        Delivery method, location and timing are confirmed with you when you order. Handmade
        work takes time; we would rather promise honestly than disappoint.
      </P>

      <H2>Product images</H2>
      <P>
        Photos and 3D previews on the site are illustrative. Because everything is handmade,
        the finished piece may vary a little from what you see — the colours and feel will be
        true to what we agreed together.
      </P>

      <H2>Returns & issues</H2>
      <UL>
        <LI>Because pieces are made to order for you, returns may be limited — we will tell you the specifics, honestly, when you order.</LI>
        <LI>If something arrives damaged or wrong, tell us straight away and we will make it right.</LI>
      </UL>

      <H2>Your account</H2>
      <UL>
        <LI>An account is optional — it lets you sign in and keep your saved designs.</LI>
        <LI>You may save up to <strong>5 designs</strong>; delete or download one to free a slot.</LI>
        <LI>Keep your sign-in details safe, and tell us if you think your account has been used without your permission. You are responsible for activity under your own account.</LI>
      </UL>

      <H2>Your ideas & content</H2>
      <P>
        Your design ideas remain yours. By sharing them you give us the limited right to
        make the piece you asked for. We will only share finished work publicly with your
        permission.
      </P>

      <H2>Acceptable use</H2>
      <P>
        Please use the site lawfully and don&apos;t misuse, overload, disrupt or try to bypass
        it, or use it to harm others.
      </P>

      <H2>Our content</H2>
      <P>
        The site&apos;s design, text, imagery and code belong to Whimlet. Please don&apos;t copy the
        site wholesale — but of course, tell your friends about us.
      </P>

      <H2>Disclaimers & liability</H2>
      <P>
        The site is provided “as is” and we don&apos;t guarantee it will always be available or
        error-free. To the fullest extent the law allows, our liability to you is limited
        to the amount you paid for the relevant order. Nothing here limits rights that can&apos;t
        be limited by law.
      </P>

      <H2>Changes to these terms</H2>
      <P>
        We may update these terms as the business grows. Continued use of the site after a
        change means you accept the new terms; the “Last updated” date will change with them.
      </P>

      <H2>Governing law</H2>
      <P>
        These terms are governed by the laws of India, and any dispute will be handled by
        the courts of Kolkata, West Bengal.
      </P>

      <H2>Contact</H2>
      <P>
        Questions? Write to{" "}
        <a href={`mailto:${site.email}`} className="font-semibold text-rose-ink underline decoration-rose/40 underline-offset-2">{site.email}</a>{" "}
        or message us on WhatsApp below.
      </P>
    </LegalPage>
  );
}
