import { Hero } from "@/components/Hero";
import { StorySection } from "@/components/StorySection";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { ProductGrid } from "@/components/ProductGrid";
import { CustomOrderExperience } from "@/components/CustomOrderExperience";
import { ColorCustomizer } from "@/components/ColorCustomizer";
import { OccasionSection } from "@/components/OccasionSection";
import { WhyHandmade } from "@/components/WhyHandmade";
import { OurStory } from "@/components/OurStory";
import { ProcessTimeline } from "@/components/ProcessTimeline";
import { Gallery } from "@/components/Gallery";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { ContactSection } from "@/components/ContactSection";
import { SocialStrip } from "@/components/SocialStrip";

/**
 * The Whimlet experience, top to bottom:
 * discover → fall in love → explore → enquire → customize → order.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <StorySection />
      <CategoryShowcase />
      <ProductGrid />
      <CustomOrderExperience />
      <ColorCustomizer />
      <OccasionSection />
      <WhyHandmade />
      <OurStory />
      <ProcessTimeline />
      <Gallery />
      <Testimonials />
      <FAQ />
      <ContactSection />
      <SocialStrip />
    </>
  );
}
