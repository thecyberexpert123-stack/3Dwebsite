import Image from "next/image";
import { withBasePath } from "@/lib/paths";

/**
 * Beautiful static composition used:
 * - while the 3D chunk loads,
 * - when WebGL is unavailable,
 * - and for no-JS visitors (rendered on the server).
 */
export function HeroStatic() {
  return (
    <div className="candy relative h-full w-full overflow-hidden">
      <div className="gingham absolute inset-0 opacity-45 mix-blend-multiply" aria-hidden="true" />
      {/* full-bleed, soft-focused at the edges so the copy sits comfortably on it */}
      <div className="absolute inset-y-0 right-0 w-full lg:w-[58%]">
        <Image
          src={withBasePath("/images/hero-fallback.jpg")}
          alt="A hand-crocheted bouquet of blush pink and cream yarn flowers with pastel yarn balls, a wooden crochet hook, a loose yarn thread, a tiny heart and a small gift box resting on a cream surface"
          fill
          priority
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#fde5ec] via-[#fde5ec]/40 to-transparent" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#fde5ec] via-transparent to-white/20" />
      </div>
    </div>
  );
}
