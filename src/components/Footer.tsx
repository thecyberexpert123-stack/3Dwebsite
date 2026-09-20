import { footerNav, site, socialPlaceholders } from "@/data/site";
import { PHONE_DISPLAY, PHONE_TEL, waLink, waMessages } from "@/lib/whatsapp";
import { HeartDoodle, PhoneDoodle, WhatsAppGlyph } from "./Decorations";

/** Boutique-catalogue footer: warm bark background, closing phrase. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-bark text-ivory/85">
      <div className="wrap grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1.2fr] md:py-20">
        {/* brand */}
        <div className="flex flex-col items-start gap-4">
          <p className="flex items-baseline gap-2">
            <span className="font-script text-4xl text-blush">Whimlet</span>
            <HeartDoodle className="h-4 w-4 text-blush" />
          </p>
          <p className="max-w-xs text-sm leading-relaxed text-ivory/70">
            {site.tagline} Crochet flowers, bouquets, keychains, charms,
            accessories, bandanas and custom creations — made specially for you.
          </p>
          <p className="font-hand text-xl text-blush/90">{site.closingPhrase}</p>
        </div>

        {/* explore */}
        <nav aria-label="Footer">
          <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-blush/80">Explore</h2>
          <ul className="mt-5 flex flex-col gap-3 text-sm">
            {footerNav.map((item) => (
              <li key={item.href}>
                <a
                  className="rounded px-1 py-0.5 text-ivory/75 transition-colors hover:text-blush"
                  href={item.href}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* contact + socials */}
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-blush/80">Contact</h2>
            <div className="mt-5 flex flex-col gap-3 text-sm">
              <a
                href={`tel:${PHONE_TEL}`}
                className="flex w-fit items-center gap-2.5 rounded px-1 py-0.5 text-ivory/75 transition-colors hover:text-blush"
              >
                <PhoneDoodle className="h-4 w-4 text-blush" /> {PHONE_DISPLAY}
              </a>
              <a
                href={waLink(waMessages.general)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2.5 rounded px-1 py-0.5 text-ivory/75 transition-colors hover:text-blush"
              >
                <WhatsAppGlyph className="h-4 w-4 text-blush" /> Chat on WhatsApp
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-blush/80">Follow along</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {socialPlaceholders.map((s) => (
                <li key={s.label}>
                  {/* placeholder until real handles exist — see src/data/site.ts */}
                  <span
                    className="flex cursor-default items-center gap-1.5 rounded-full border border-ivory/20 px-3.5 py-1.5 text-xs font-semibold text-ivory/55"
                    title="Coming soon"
                    aria-label={`${s.label} — coming soon`}
                  >
                    {s.label}
                    <span className="font-hand text-[0.8rem] text-blush/70">soon</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="wrap flex flex-col items-center justify-between gap-3 py-6 text-xs text-ivory/55 sm:flex-row">
          <p>© {year} {site.name} · {site.tagline}</p>
          <p className="flex items-center gap-1.5">
            Made with <HeartDoodle className="h-3 w-3 text-blush" /> and a lot of yarn
          </p>
        </div>
      </div>
    </footer>
  );
}
