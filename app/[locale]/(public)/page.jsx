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

export default function Home() {
    return (
        <div>
            <Hero />
            <FlashDealsSection />
            <HalalCertifiedSection />
            <LatestProducts />
            <MarketplaceHighlights />
            <BestSelling />
            <ForHireSection />
            <OurSpecs />
            <Newsletter />
        </div>
    );
}
