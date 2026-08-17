"use client";
import { assets } from "@/assets/assets";
import { BadgeCheckIcon, Clock3Icon, ShieldCheckIcon, SparklesIcon, TruckIcon, WalletCardsIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import CurrencyAmount from "@/components/CurrencyAmount";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/paymentOptions";

const MarketplaceHighlights = () => {
    const { t } = useTranslation();

    const highlights = [
        { title: t("highlights.trustedSellers"), text: t("highlights.trustedSellersText"), icon: ShieldCheckIcon },
        { title: t("highlights.betterPrices"), text: t("highlights.betterPricesText"), icon: SparklesIcon },
        { title: t("highlights.easyReturns"), text: t("highlights.easyReturnsText"), icon: Clock3Icon },
        { title: t("highlights.safeCheckout"), text: t("highlights.safeCheckoutText"), icon: WalletCardsIcon },
    ];

    return (
        <section className="mx-6 my-24">
            <div className="max-w-7xl mx-auto grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl bg-[#F5F0EB] p-6 text-[#1A1A1A] ring-1 ring-[#E8E2DB] sm:p-10">
                    <div className="flex items-center gap-2 text-sm text-[#6B6560]">
                        <BadgeCheckIcon size={18} className="text-[#C9A96E]" />
                        <span className="text-editorial">{t("highlights.trustBadge")}</span>
                    </div>
                    <h2 className="mt-4 max-w-2xl font-display text-3xl font-medium leading-tight sm:text-4xl">
                        {t("highlights.headline")}
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B6560]">
                        {t("highlights.body")}
                    </p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        {highlights.map((item) => (
                            <div key={item.title} className="rounded-3xl border border-[#E8E2DB] bg-white p-5 shadow-sm transition hover:border-[#C9A96E]/40 hover:shadow-md">
                                <item.icon className="text-[#C9A96E]" size={22} />
                                <h3 className="mt-3 font-semibold text-[#1A1A1A]">{item.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-[#6B6560]">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-5">
                    <Link href="/shop" className="group flex min-h-48 items-center justify-between overflow-hidden rounded-3xl bg-[#f5efe4] p-6 ring-1 ring-[#E8E2DB] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#C9A96E]/10">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#A88B52] shadow-sm ring-1 ring-[#E8E2DB]">
                                <TruckIcon size={14} />
                                {t("highlights.freeDeliveryOver")} <CurrencyAmount amount={FREE_DELIVERY_THRESHOLD} />
                            </div>
                            <h3 className="mt-5 max-w-52 font-display text-2xl font-medium text-[#1A1A1A]">{t("highlights.trustedGadgets")}</h3>
                            <p className="mt-3 text-sm text-[#6B6560]">{t("highlights.exploreVerified")}</p>
                        </div>
                        <Image src={assets.hero_product_img1} alt="Featured gadget" className="w-32 transition group-hover:scale-105 sm:w-40" />
                    </Link>
                    <Link href="/pricing" className="group flex min-h-48 items-center justify-between overflow-hidden rounded-3xl bg-[#f6f1e8] p-6 ring-1 ring-[#E8E2DB] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#C9A96E]/10">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#A88B52] shadow-sm ring-1 ring-[#E8E2DB]">
                                <SparklesIcon size={14} />
                                {t("highlights.memberSavings")}
                            </div>
                            <h3 className="mt-5 max-w-52 font-display text-2xl font-medium text-[#1A1A1A]">{t("highlights.vipPerks")}</h3>
                            <p className="mt-3 text-sm text-[#6B6560]">{t("highlights.joinForExclusive")}</p>
                        </div>
                        <Image src={assets.hero_product_img2} alt="Member savings" className="w-32 transition group-hover:scale-105 sm:w-40" />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default MarketplaceHighlights;
