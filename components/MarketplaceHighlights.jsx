import { assets } from "@/assets/assets";
import { BadgeCheckIcon, Clock3Icon, ShieldCheckIcon, SparklesIcon, TruckIcon, WalletCardsIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const highlights = [
    { title: "Buyer Protection", text: "Clear seller standards, support-first disputes, and safer checkout.", icon: ShieldCheckIcon },
    { title: "Fast Deals", text: "Daily-style offers, coupon moments, and new-user savings.", icon: SparklesIcon },
    { title: "Easy Returns", text: "Return eligible items within 7 days when they are unused and complete.", icon: Clock3Icon },
    { title: "Secure Payments", text: "Checkout uses trusted payment flows and order verification.", icon: WalletCardsIcon },
];

const MarketplaceHighlights = () => {
    return (
        <section className="mx-6 my-24">
            <div className="max-w-7xl mx-auto grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-lg bg-slate-900 p-6 sm:p-10 text-white">
                    <div className="flex items-center gap-2 text-sm text-green-300">
                        <BadgeCheckIcon size={18} />
                        Marketplace upgrades inspired by leading global shopping apps
                    </div>
                    <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                        Better discovery, stronger trust, and offers shoppers can understand fast.
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                        ABU Marketplace now surfaces the confidence cues shoppers expect before they buy: seller trust, delivery value, returns, secure payments, and promotional moments.
                    </p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        {highlights.map((item) => (
                            <div key={item.title} className="rounded-lg border border-white/10 bg-white/5 p-4">
                                <item.icon className="text-green-300" size={22} />
                                <h3 className="mt-3 font-medium">{item.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-5">
                    <Link href="/shop" className="group flex min-h-48 items-center justify-between overflow-hidden rounded-lg bg-green-100 p-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-green-700">
                                <TruckIcon size={14} />
                                Free delivery over SLe500
                            </div>
                            <h3 className="mt-5 max-w-52 text-2xl font-semibold text-slate-800">Find trusted gadgets and everyday tech.</h3>
                            <p className="mt-3 text-sm text-slate-600">Shop all products</p>
                        </div>
                        <Image src={assets.hero_product_img1} alt="" className="w-32 transition group-hover:scale-105 sm:w-40" />
                    </Link>
                    <Link href="/pricing" className="group flex min-h-48 items-center justify-between overflow-hidden rounded-lg bg-orange-100 p-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-orange-700">
                                <SparklesIcon size={14} />
                                Member savings
                            </div>
                            <h3 className="mt-5 max-w-52 text-2xl font-semibold text-slate-800">Unlock plus benefits and better deals.</h3>
                            <p className="mt-3 text-sm text-slate-600">View membership</p>
                        </div>
                        <Image src={assets.hero_product_img2} alt="" className="w-32 transition group-hover:scale-105 sm:w-40" />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default MarketplaceHighlights;
