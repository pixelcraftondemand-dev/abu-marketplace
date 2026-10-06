import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import LatestProducts from "@/components/LatestProducts";
import FlashDealsSection from "@/components/FlashDealsSection";
import MarketplaceHighlights from "@/components/MarketplaceHighlights";
import TrustStrip from "@/components/TrustStrip";
import CategoryQuickLinks from "@/components/CategoryQuickLinks";
import ScrollReveal from "@/components/ScrollReveal";
import { getHomePageContent, urlFor } from "@/lib/cms";

export default async function HomePage({ locale = "en" }) {
    const cmsContent = await getHomePageContent(locale);
    const heroImage = cmsContent?.heroImage ? urlFor(cmsContent.heroImage)?.url() : null;

    return (
        <div>
            {/* Hero — Full-width promotional carousel */}
            <ScrollReveal direction="none" duration={0.7}>
                <Hero cmsContent={cmsContent ? {
                    heroTitle: cmsContent.heroTitle,
                    heroSubtitle: cmsContent.heroSubtitle,
                    heroCtaText: cmsContent.heroCtaText,
                    heroCtaHref: cmsContent.heroCtaHref,
                    image: heroImage,
                } : null} />
            </ScrollReveal>

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

            {/* Collection Banners — brand spotlight, new arrivals, clearance */}
            <ScrollReveal>
                <MarketplaceHighlights />
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
