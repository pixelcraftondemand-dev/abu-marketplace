"use client";

import {
  BadgeCheckIcon,
  Clock3Icon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletCardsIcon,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const benefits = [
  { title: "highlights.qualityProducts", text: "highlights.qualityProductsText", icon: ShieldCheckIcon },
  { title: "highlights.betterPrices", text: "highlights.betterPricesText", icon: SparklesIcon },
  { title: "highlights.easyReturns", text: "highlights.easyReturnsText", icon: Clock3Icon },
  { title: "highlights.cashOnDelivery", text: "highlights.cashOnDeliveryText", icon: WalletCardsIcon },
];

export default function MarketplaceBenefits() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-[#f3d9a3]">
          <BadgeCheckIcon size={16} />
          <span className="text-editorial">{t("highlights.trustBadge")}</span>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-white">
          {t("highlights.headline")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {t("highlights.body")}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {benefits.map(({ title, text, icon: Icon }) => (
          <article
            key={title}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <Icon className="text-[var(--color-primary)]" size={20} />
            <h3 className="mt-2.5 text-sm font-semibold text-gray-800">{t(title)}</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{t(text)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
