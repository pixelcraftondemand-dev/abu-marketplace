"use client";

import Link from "next/link";
import { ArrowRight, Hammer, HardHat, Paintbrush, ShieldCheck, Wrench, Zap } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const tradeIcons = [
  { label: "Plumber", icon: Wrench },
  { label: "Electrician", icon: Zap },
  { label: "Carpenter", icon: Hammer },
  { label: "Painter", icon: Paintbrush },
  { label: "Tailor", icon: HardHat },
];

export default function ForHireSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-[#1A1A1A] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Copy */}
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C9A96E]">
              <HardHat size={14} />
              {t("services.homeEyebrow")}
            </p>
            <h2 className="font-display text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
              {t("services.homeTitle")}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">{t("services.homeText")}</p>

            {/* Trade chips */}
            <div className="mt-8 flex flex-wrap gap-2.5">
              {tradeIcons.map(({ label, icon: Icon }) => (
                <Link
                  key={label}
                  href={`/services?trade=${encodeURIComponent(label)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-[#C9A96E] hover:text-[#C9A96E]"
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/services"
                className="btn-gold"
              >
                {t("services.homeCta")}
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/services#list-your-service"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-[#C9A96E] hover:text-[#C9A96E]"
              >
                {t("services.homeSecondaryCta")}
              </Link>
            </div>
          </div>

          {/* Visual card stack */}
          <div className="relative hidden lg:block">
            <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#2D2D2D] to-[#1A1A1A] p-8 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#C9A96E] text-[#1A1A1A]">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="font-display text-xl text-white">{t("services.homeCardTitle")}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#C9A96E]">{t("services.homeCardBadge")}</p>
                </div>
              </div>

              <ul className="mt-8 space-y-4">
                {[t("services.homeFeature1"), t("services.homeFeature2"), t("services.homeFeature3")].map((feature, i) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-white/75">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#C9A96E]/20 text-[11px] font-bold text-[#C9A96E]">
                      {i + 1}
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-center">
                {[
                  { value: "3", label: t("services.statCategories") },
                  { value: "15+", label: t("services.statTrades") },
                  { value: "24h", label: t("services.statResponse") },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-display text-2xl text-[#C9A96E]">{stat.value}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/50">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
