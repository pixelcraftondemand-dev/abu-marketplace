"use client";

import Link from "next/link";
import { ArrowRight, Hammer, HardHat, Paintbrush, ShieldCheck, Wrench, Zap } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { StaggerReveal, StaggerItem } from "@/components/ScrollReveal";

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
    <section className="bg-[var(--bg-topbar)] py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Copy */}
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              <HardHat size={14} />
              {t("services.homeEyebrow")}
            </p>
            <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
              {t("services.homeTitle")}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70">{t("services.homeText")}</p>

            {/* Trade chips */}
            <StaggerReveal className="mt-6 flex flex-wrap gap-2" stagger={0.06}>
              {tradeIcons.map(({ label, icon: Icon }) => (
                <StaggerItem key={label}>
                  <Link
                    href={`/services?trade=${encodeURIComponent(label)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <Icon size={13} />
                    {label}
                  </Link>
                </StaggerItem>
              ))}
            </StaggerReveal>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/services" className="btn-gold">
                {t("services.homeCta")}
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/services#list-your-service"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {t("services.homeSecondaryCta")}
              </Link>
            </div>
          </div>

          {/* Visual card stack */}
          <div className="relative hidden lg:block">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{t("services.homeCardTitle")}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">{t("services.homeCardBadge")}</p>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {[t("services.homeFeature1"), t("services.homeFeature2"), t("services.homeFeature3")].map((feature, i) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-white/70">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[10px] font-bold text-[var(--accent)]">
                      {i + 1}
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center">
                {[
                  { value: "3", label: t("services.statCategories") },
                  { value: "15+", label: t("services.statTrades") },
                  { value: "24h", label: t("services.statResponse") },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-xl font-bold text-[var(--accent)]">{stat.value}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-white/50">{stat.label}</p>
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
