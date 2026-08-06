"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth, useUser } from "@clerk/nextjs";
import { premiumTiers } from "@/lib/pricingPlans";

export default function PricingPage() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const [loadingTier, setLoadingTier] = useState(null);
    const [membershipState, setMembershipState] = useState(null);

    useEffect(() => {
        const loadMembershipState = async () => {
            if (!user) {
                setMembershipState(null);
                return;
            }

            try {
                const token = await getToken();
                const { data } = await axios.get("/api/subscriptions/status", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setMembershipState(data?.membership || null);
            } catch (error) {
                console.error("Failed to load membership state", error);
            }
        };

        loadMembershipState();
    }, [getToken, user]);

    const handleSelectTier = async (tier) => {
        if (!user) {
            toast.error("Please sign in to subscribe.");
            return;
        }

        try {
            setLoadingTier(tier.id);
            const token = await getToken();
            const { data } = await axios.post("/api/subscriptions/checkout", {
                tierId: tier.id,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (data?.session?.url) {
                window.location.href = data.session.url;
                return;
            }

            toast.success("Subscription checkout is ready.");
        } catch (error) {
            toast.error(error?.response?.data?.error || "Unable to start checkout.");
        } finally {
            setLoadingTier(null);
        }
    };

    return (
        <div className="mx-auto my-16 max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#A2825F]">Premium membership</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#1A1A1A]">Choose the plan that fits your shopping style.</h1>
                <p className="mt-4 text-base leading-7 text-[#6A6053]">
                    ABU gives buyers and sellers a more premium experience with layered perks, faster support, and stronger value as you scale up.
                </p>
                {membershipState?.status === "active" && (
                    <div className="mt-6 rounded-full border border-[#C9A96E] bg-[#FCF7EE] px-4 py-2 text-sm font-medium text-[#7B6446]">
                        Active plan: {premiumTiers.find((tier) => tier.id === membershipState.membershipTier)?.name || "Premium"}
                    </div>
                )}
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
                {premiumTiers.map((tier) => (
                    <div
                        key={tier.id}
                        className={`rounded-[1.75rem] border p-8 shadow-sm ${tier.id === "plus"
                            ? "border-[#C9A96E] bg-[#FCF7EE] shadow-[0_20px_60px_rgba(34,34,34,0.08)]"
                            : "border-[#E8DCC8] bg-white"
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-2xl font-semibold text-[#1A1A1A]">{tier.name}</h2>
                            {tier.badge && (
                                <span className="rounded-full bg-[#F0E3D1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#7B6446]">
                                    {tier.badge}
                                </span>
                            )}
                        </div>
                        <p className="mt-4 text-sm leading-6 text-[#6A6053]">{tier.description}</p>
                        <div className="mt-8 flex items-end gap-2">
                            <span className="text-4xl font-semibold text-[#1A1A1A]">
                                {tier.priceMonthly === 0 ? "Free" : `$${tier.priceMonthly}`}
                            </span>
                            {tier.priceMonthly > 0 && <span className="mb-1 text-sm text-[#8C8071]">/ month</span>}
                        </div>
                        <ul className="mt-8 space-y-3 text-sm text-[#5B5245]">
                            {tier.perks.map((perk) => (
                                <li key={perk} className="flex gap-3">
                                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#C9A96E]" />
                                    <span>{perk}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleSelectTier(tier)}
                            disabled={loadingTier === tier.id}
                            className="mt-8 w-full rounded-full bg-[#1A1A1A] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loadingTier === tier.id ? "Starting…" : tier.cta}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}