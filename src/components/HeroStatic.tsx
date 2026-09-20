import Image from "next/image";

/**
 * Beautiful static composition used:
 * - while the 3D chunk loads,
 * - when WebGL is unavailable,
 * - and for no-JS visitors (rendered on the server).
 */
export function HeroStatic() {
  return (
    <div className="relative h-full w-full">
      {/* soft blush halo */}
      <div
        aria-hidden="true"
        className="absolute -inset-10 -z-10 rounded-full bg-blush/45 blur-3xl"
      />
      <div className="absolute inset-2 rotate-1 overflow-hidden rounded-[3rem] shadow-lift md:inset-5 md:rotate-[0.6deg]">
        <Image
          src="/images/hero-fallback.jpg"
          alt="A hand-crocheted bouquet of blush pink and cream yarn flowers with pastel yarn balls, a wooden crochet hook, a loose yarn thread, a tiny heart and a small gift box resting on a cream surface"
          fill
          priority
          sizes="(min-width: 1024px) 46vw, 92vw"
          className="object-cover"
        />
        {/* warm wash so it sits softly in the page */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-blush-soft/25 via-transparent to-white/10"
        />
      </div>
    </div>
  );
}
