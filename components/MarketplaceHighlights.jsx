"use client";
import { assets } from "@/assets/assets";
import { BadgeCheckIcon, Clock3Icon, ShieldCheckIcon, SparklesIcon, TruckIcon, WalletCardsIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import CurrencyAmount from "@/components/CurrencyAmount";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/paymentOptions";
import { StaggerReveal, StaggerItem } from "@/components/ScrollReveal";

const MarketplaceHighlights = () => {
    const { t } = useTranslation();

    const highlights = [
        { title: t("highlights.trustedSellers"), text: t("highlights.trustedSellersText"), icon: ShieldCheckIcon },
        { title: t("highlights.betterPrices"), text: t("highlights.betterPricesText"), icon: SparklesIcon },
        { title: t("highlights.easyReturns"), text: t("highlights.easyReturnsText"), icon: Clock3Icon },
        { title: t("highlights.safeCheckout"), text: t("highlights.safeCheckoutText"), icon: WalletCardsIcon },
    ];

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 sm:my-14">
            <div className="max-w-7xl mx-auto grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                {/* Trust features panel */}
                <div className="rounded-xl bg-[var(--abu-blue-light)] p-6 sm:p-8">
                    <div className="flex items-center gap-2 text-sm text-[var(--accent)]">
                        <BadgeCheckIcon size={16} />
                        <span className="text-editorial">{t("highlights.trustBadge")}</span>
                    </div>
                    <h2 className="mt-3 text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-tight">
                        {t("highlights.headline")}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                        {t("highlights.body")}
                    </p>
                    <StaggerReveal className="mt-6 grid gap-3 sm:grid-cols-2">
                        {highlights.map((item) => (
                            <StaggerItem key={item.title}>
                                <div className="rounded-xl border border-gray-100 bg-white p-4 transition-all duration-200 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:border-gray-200 hover:-translate-y-0.5">
                                    <item.icon className="text-[var(--color-primary)]" size={20} />
                                    <h3 className="mt-2.5 font-semibold text-sm text-gray-800">{item.title}</h3>
                                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.text}</p>
                                </div>
                            </StaggerItem>
                        ))}
                    </StaggerReveal>
                </div>

                {/* Promo cards */}
                <div className="grid gap-4">
                    <Link href="/shop" className="group flex min-h-40 items-center justify-between overflow-hidden rounded-2xl bg-gray-50 p-6 border border-gray-100 transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] hover:border-gray-200 hover:-translate-y-0.5">
                        <div>
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                                <TruckIcon size={12} />
                                {t("highlights.freeDeliveryOver")} <CurrencyAmount amount={FREE_DELIVERY_THRESHOLD} />
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-gray-900">{t("highlights.trustedGadgets")}</h3>
                            <p className="mt-1.5 text-xs text-gray-500">{t("highlights.exploreVerified")}</p>
                        </div>
                        <Image src={assets.hero_product_img1} alt="Featured gadget" className="w-28 transition-transform duration-300 group-hover:scale-110 sm:w-36" />
                    </Link>
                    <Link href="/pricing" className="group flex min-h-40 items-center justify-between overflow-hidden rounded-2xl bg-gray-50 p-6 border border-gray-100 transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] hover:border-gray-200 hover:-translate-y-0.5">
                        <div>
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600">
                                <SparklesIcon size={12} />
                                {t("highlights.memberSavings")}
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-gray-900">{t("highlights.vipPerks")}</h3>
                            <p className="mt-1.5 text-xs text-gray-500">{t("highlights.joinForExclusive")}</p>
                        </div>
                        <Image src={assets.hero_product_img2} alt="Member savings" className="w-28 transition-transform duration-300 group-hover:scale-110 sm:w-36" />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default MarketplaceHighlights;
