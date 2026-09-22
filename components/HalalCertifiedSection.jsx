"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function HalalCertifiedSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-[var(--bg-muted)] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-surface)] p-6 shadow-sm lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] mb-2 font-semibold">
              {t("landing.halalCertifiedSectionLabel")}
            </p>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {t("landing.halalCertifiedSectionTitle")}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
              {t("landing.halalCertifiedSectionText")}
            </p>
          </div>
          <Link
            href="/shop?category=halal-certified"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
          >
            {t("landing.exploreHalalCertified")}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
