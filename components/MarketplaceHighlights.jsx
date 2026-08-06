"use client";
import { assets } from "@/assets/assets";
import { BadgeCheckIcon, Clock3Icon, ShieldCheckIcon, SparklesIcon, TruckIcon, WalletCardsIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import CurrencyAmount from "@/components/CurrencyAmount";

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
                <div className="rounded-lg bg-slate-100 p-6 sm:p-10 text-slate-900 shadow-sm ring-1 ring-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <BadgeCheckIcon size={18} className="text-emerald-500" />
                        {t("highlights.trustBadge")}
                    </div>
                    <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                        {t("highlights.headline")}
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                        {t("highlights.body")}
                    </p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        {highlights.map((item) => (
                            <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <item.icon className="text-emerald-500" size={22} />
                                <h3 className="mt-3 font-semibold text-slate-900">{item.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-5">
                    <Link href="/shop" className="group flex min-h-48 items-center justify-between overflow-hidden rounded-lg bg-emerald-50 p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                                <TruckIcon size={14} />
                                {t("highlights.freeDeliveryOver")} <CurrencyAmount amount={500} />
                            </div>
                            <h3 className="mt-5 max-w-52 text-2xl font-semibold text-slate-900">{t("highlights.trustedGadgets")}</h3>
                            <p className="mt-3 text-sm text-slate-600">{t("highlights.exploreVerified")}</p>
                        </div>
                        <Image src={assets.hero_product_img1} alt="Featured gadget" className="w-32 transition group-hover:scale-105 sm:w-40" />
                    </Link>
                    <Link href="/pricing" className="group flex min-h-48 items-center justify-between overflow-hidden rounded-lg bg-amber-50 p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 shadow-sm">
                                <SparklesIcon size={14} />
                                {t("highlights.memberSavings")}
                            </div>
                            <h3 className="mt-5 max-w-52 text-2xl font-semibold text-slate-900">{t("highlights.vipPerks")}</h3>
                            <p className="mt-3 text-sm text-slate-600">{t("highlights.joinForExclusive")}</p>
                        </div>
                        <Image src={assets.hero_product_img2} alt="Member savings" className="w-32 transition group-hover:scale-105 sm:w-40" />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default MarketplaceHighlights;
