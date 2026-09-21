import { Hero } from "@/components/Hero";
import { StorySection } from "@/components/StorySection";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { ProductGrid } from "@/components/ProductGrid";
import { CustomOrderExperience } from "@/components/CustomOrderExperience";
import { DesignStudio } from "@/components/DesignStudio";
import { Marquee } from "@/components/Marquee";
import { OccasionSection } from "@/components/OccasionSection";
import { WhyHandmade } from "@/components/WhyHandmade";
import { OurStory } from "@/components/OurStory";
import { ProcessTimeline } from "@/components/ProcessTimeline";
import { Gallery } from "@/components/Gallery";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { ContactSection } from "@/components/ContactSection";
import { SocialStrip } from "@/components/SocialStrip";
import { Beat } from "@/components/Beat";

/**
 * The Whimlet experience, top to bottom:
 * discover → fall in love → explore → enquire → customize → order.
 */
export default function HomePage() {
  // Each section is wrapped in a Beat: the transition between them (a peel
  // away at the top edge) is one shared move; z keeps earlier sections above
  // later ones so scalloped trims still overhang.
  const beats = [
    <Hero key="hero" />,
    <StorySection key="story-beat" />,
    <CategoryShowcase key="collections" />,
    <ProductGrid key="shop" />,
    <Marquee key="marquee" />,
    <CustomOrderExperience key="custom" />,
    <DesignStudio key="studio" />,
    <OccasionSection key="occasions" />,
    <WhyHandmade key="why" />,
    <OurStory key="story" />,
    <ProcessTimeline key="process" />,
    <Gallery key="gallery" />,
    <Testimonials key="kind-words" />,
    <FAQ key="faq" />,
    <ContactSection key="contact" />,
    <SocialStrip key="follow" />,
  ];
  return (
    <>
      {beats.map((node, i) => (
        <Beat key={node.key} z={beats.length - i}>
          {node}
        </Beat>
      ))}
    </>
  );
}
