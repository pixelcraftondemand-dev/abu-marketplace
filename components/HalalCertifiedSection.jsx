"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function HalalCertifiedSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-[var(--bg-muted)] py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid gap-8 rounded-[32px] border border-[var(--border-primary)] bg-[var(--bg-surface)] p-8 shadow-sm lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--accent)]/10 text-[var(--text-primary)]">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent)] mb-3">
              {t("landing.halalCertifiedSectionLabel")}
            </p>
            <h2 className="font-display text-3xl text-[var(--text-primary)] mb-4">
              {t("landing.halalCertifiedSectionTitle")}
            </h2>
            <p className="text-base text-[var(--text-secondary)] max-w-2xl">
              {t("landing.halalCertifiedSectionText")}
            </p>
          </div>
          <Link
            href="/shop?category=halal-certified"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--text-primary)] px-6 py-3 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--text-primary)]/90"
          >
            {t("landing.exploreHalalCertified")}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
