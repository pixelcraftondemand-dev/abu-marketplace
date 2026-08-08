"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function HalalCertifiedSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-[#F7F3EB] py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid gap-8 rounded-[32px] border border-[#E8E2DB] bg-white p-8 shadow-sm lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#C9A96E]/10 text-[#1A1A1A]">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#C9A96E] mb-3">
              {t("landing.halalCertifiedSectionLabel")}
            </p>
            <h2 className="font-display text-3xl text-[#1A1A1A] mb-4">
              {t("landing.halalCertifiedSectionTitle")}
            </h2>
            <p className="text-base text-[#6B6560] max-w-2xl">
              {t("landing.halalCertifiedSectionText")}
            </p>
          </div>
          <Link
            href="/shop?category=halal-certified"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2D2D2D]"
          >
            {t("landing.exploreHalalCertified")}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
