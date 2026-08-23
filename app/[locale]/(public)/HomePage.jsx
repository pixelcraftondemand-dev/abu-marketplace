'use client'
import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import MarketplaceHighlights from "@/components/MarketplaceHighlights";
import FlashDealsSection from "@/components/FlashDealsSection";
import HalalCertifiedSection from "@/components/HalalCertifiedSection";
import ForHireSection from "@/components/ForHireSection";
import ScrollReveal from "@/components/ScrollReveal";

export default function HomePage() {
    return (
        <div>
            {/* Hero — subtle entrance, no directional slide */}
            <ScrollReveal direction="none" duration={0.7}>
                <Hero />
            </ScrollReveal>

            {/* Flash Deals — slides up from below */}
            <ScrollReveal delay={0.05}>
                <FlashDealsSection />
            </ScrollReveal>

            {/* Halal Certified — slides up */}
            <ScrollReveal>
                <HalalCertifiedSection />
            </ScrollReveal>

            {/* Latest Products — slides up */}
            <ScrollReveal>
                <LatestProducts />
            </ScrollReveal>

            {/* Marketplace Highlights — slides up */}
            <ScrollReveal>
                <MarketplaceHighlights />
            </ScrollReveal>

            {/* Best Selling — slides up */}
            <ScrollReveal>
                <BestSelling />
            </ScrollReveal>

            {/* For Hire Services — slides up */}
            <ScrollReveal>
                <ForHireSection />
            </ScrollReveal>

            {/* Our Specs — slides up */}
            <ScrollReveal>
                <OurSpecs />
            </ScrollReveal>

            {/* Newsletter — slides up */}
            <ScrollReveal>
                <Newsletter />
            </ScrollReveal>
        </div>
    );
}
