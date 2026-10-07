import BestSelling from "@/components/BestSelling";
import Newsletter from "@/components/Newsletter";
import LatestProducts from "@/components/LatestProducts";
import FlashDealsSection from "@/components/FlashDealsSection";
import TrustStrip from "@/components/TrustStrip";
import CategoryQuickLinks from "@/components/CategoryQuickLinks";
import ScrollReveal from "@/components/ScrollReveal";

export default function HomePage() {
    return (
        <div>
            {/* Trust Strip — 4 icons: delivery, quality, returns, secure */}
            <ScrollReveal direction="none" duration={0.3}>
                <TrustStrip />
            </ScrollReveal>

            {/* Category Quick-Links — 8 icon tiles */}
            <ScrollReveal direction="none" duration={0.3}>
                <CategoryQuickLinks />
            </ScrollReveal>

            {/* Flash Deals — countdown timer + dense grid */}
            <ScrollReveal delay={0.05}>
                <FlashDealsSection />
            </ScrollReveal>

            {/* Trending / Best Selling — "Because you might like" */}
            <ScrollReveal>
                <BestSelling />
            </ScrollReveal>

            {/* Latest Products — full category grid */}
            <ScrollReveal>
                <LatestProducts />
            </ScrollReveal>

            {/* Newsletter */}
            <ScrollReveal>
                <Newsletter />
            </ScrollReveal>
        </div>
    );
}
