import type { Metadata } from "next";
import { LegalPage, H2, P, UL, LI } from "@/components/LegalPage";
import { absoluteUrl } from "@/lib/paths";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Privacy Policy | Whimlet",
  description:
    "How Whimlet collects, uses and protects your information when you enquire, order, save designs or sign in.",
  alternates: { canonical: absoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Privacy Policy"
      title="Your privacy, kept simple"
      updated="23 September 2026"
      intro={
        <P>
          Whimlet is a small handmade-crochet business. We only ask for what we need to
          answer you, make your piece, and let you save your designs — and we try to
          say so in plain words. This page explains what we collect, why, and your
          rights over it.
        </P>
      }
    >
      <H2>The short version</H2>
      <UL>
        <LI>We never sell your information or use it for advertising.</LI>
        <LI>Most of what you tell us is sent straight to WhatsApp and answered in chat.</LI>
        <LI>If you create an account, we keep your email (and optional name) so you can sign in and save up to 5 designs.</LI>
        <LI>You can ask us to correct, export or delete your information any time.</LI>
      </UL>

      <H2>Who “we” are</H2>
      <P>
        Whimlet ({site.name}) is an independent handmade-crochet store — flowers,
        bouquets, keychains, charms, accessories, bandanas and custom pieces. You can
        contact us at <a href={`mailto:${site.email}`} className="font-semibold text-rose-ink underline decoration-rose/40 underline-offset-2">{site.email}</a> or over WhatsApp.
      </P>

      <H2>What we collect, and when</H2>
      <UL>
        <LI>
          <strong>Enquiries & orders.</strong> When you message us or use the custom-order
          form, we receive the details you choose to share — your name, phone number or
          email, your design idea, colours and product choices. That message is delivered
          to our WhatsApp; the website itself does not store a copy of it.
        </LI>
        <LI>
          <strong>Accounts & sign-in.</strong> If you sign in with email (with or without a
          password) or with Google, we store your email address (and any name you give, or
          that Google shares) as your account identity. This data is kept by Supabase, the
          authentication and database provider we run on.
        </LI>
        <LI>
          <strong>Saved designs.</strong> When you save a 3D design in the studio or maker,
          it is stored in your account (up to 5 at a time) so you can reopen it later. You
          can delete a saved design, or download it, to free a slot.
        </LI>
        <LI>
          <strong>Google sign-in basics.</strong> If you choose “Continue with Google”, Google
          shares only your name and email address (the <code className="rounded bg-blush-soft/60 px-1">openid</code>, <code className="rounded bg-blush-soft/60 px-1">email</code> and{" "}
          <code className="rounded bg-blush-soft/60 px-1">profile</code> scopes) so we can create
          or recognise your account. We do not read your contacts, calendar or files.
        </LI>
      </UL>

      <H2>What we do not do</H2>
      <UL>
        <LI>We do not sell, rent or trade your information.</LI>
        <LI>We do not run advertising or behavioural tracking on this site.</LI>
        <LI>We do not take payments on the website — any payment details are handled outside it, in your chat with us.</LI>
        <LI>We do not keep secret keys or credentials in the browser.</LI>
      </UL>

      <H2>Why we process it</H2>
      <P>
        We use your information to reply to you, take and make your order, keep your
        account and saved designs working, and (where needed) meet legal obligations.
        This relies on your consent, on carrying out what you asked for, and on our
        legitimate interest in running a small business and supporting our customers.
      </P>

      <H2>Who we share it with</H2>
      <UL>
        <LI>
          <strong>Supabase</strong> — our authentication and database provider (its servers
          host accounts and saved designs).
        </LI>
        <LI>
          <strong>WhatsApp / Meta</strong> — only for messages you choose to send us there.
        </LI>
        <LI>
          <strong>Google</strong> — only if you choose Google sign-in, to authenticate you.
        </LI>
        <LI>
          <strong>Where the law requires</strong> — or to protect our rights, safety or property.
        </LI>
      </UL>

      <H2>Storage & retention</H2>
      <P>
        Account and design data is stored by Supabase in secure, access-controlled
        databases. We keep your account and saved designs while they exist, and enquiry or
        order details only as long as is needed to fulfil and support your order or as the
        law requires. You can ask us to delete it sooner — we will.
      </P>

      <H2>Security</H2>
      <P>
        We take reasonable safeguards: your connection to the site and database is
        encrypted in transit, the database enforces row-level permissions (your designs are
        only readable by you, or by us to support you), and the site ships no secret keys.
        No method of transmission or storage is 100% secure, but we work to a standard that
        is appropriate for a small store.
      </P>

      <H2>Your rights</H2>
      <UL>
        <LI>Access — ask what we hold about you.</LI>
        <LI>Correction — fix anything that is wrong.</LI>
        <LI>Deletion — ask us to remove your account, designs or messages.</LI>
        <LI>Portability — get a copy of your data in a usable form.</LI>
        <LI>Withdraw consent — change your mind any time.</LI>
        <LI>Complain — lodge a concern with a data-protection authority if you believe we have mishandled your data.</LI>
      </UL>

      <H2>Children</H2>
      <P>
        Whimlet is not directed at children, and we do not knowingly collect their
        information. If you believe a child has provided personal information, contact us
        and we will delete it.
      </P>

      <H2>Changes to this policy</H2>
      <P>
        If we change how we handle your information, we will update this page and its
        “Last updated” date. Substantial changes will be made easy to notice.
      </P>

      <H2>Contact</H2>
      <P>
        For anything privacy-related, write to{" "}
        <a href={`mailto:${site.email}`} className="font-semibold text-rose-ink underline decoration-rose/40 underline-offset-2">{site.email}</a>{" "}
        or message us on WhatsApp using the button below.
      </P>
    </LegalPage>
  );
}
