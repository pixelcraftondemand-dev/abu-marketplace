"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  HardHat,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Wrench,
  X,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { serviceCategories, serviceWorkers } from "@/lib/servicesData";
import WorkerCard from "@/components/WorkerCard";
import ServiceRequestForm from "@/components/ServiceRequestForm";
import ServiceRegisterForm from "@/components/ServiceRegisterForm";

const categoryMeta = {
  home: { icon: Building2, descKey: "services.categoryHomeDesc" },
  repair: { icon: Wrench, descKey: "services.categoryRepairDesc" },
  personal: { icon: HardHat, descKey: "services.categoryPersonalDesc" },
};

function ServicesPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  // Preset from the homepage trade chips: /services?trade=Plumber
  const presetTrade = searchParams.get("trade") || "";
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState(presetTrade);
  const [selectedWorker, setSelectedWorker] = useState(null);

  // Keep the filter in sync when the ?trade= param changes (e.g. homepage chips
  // clicked while already on this page).
  useEffect(() => {
    setSearchTerm(presetTrade);
  }, [presetTrade]);

  const workers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return serviceWorkers.filter((worker) => {
      const matchesCategory = activeCategory === "all" || worker.category === activeCategory;
      const matchesQuery =
        !query ||
        worker.name.toLowerCase().includes(query) ||
        worker.trade.toLowerCase().includes(query) ||
        worker.location.toLowerCase().includes(query) ||
        worker.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchTerm]);

  const categoryChips = useMemo(() => {
    const counts = serviceWorkers.reduce((acc, w) => {
      acc[w.category] = (acc[w.category] || 0) + 1;
      return acc;
    }, {});
    return [
      { id: "all", label: t("services.allTrades"), count: serviceWorkers.length },
      ...serviceCategories.map((cat) => ({
        id: cat.id,
        label: t(cat.labelKey),
        count: counts[cat.id] || 0,
      })),
    ];
  }, [t]);

  const howItWorks = [
    { icon: Search, title: t("services.step1Title"), text: t("services.step1Text") },
    { icon: Phone, title: t("services.step2Title"), text: t("services.step2Text") },
    { icon: ShieldCheck, title: t("services.step3Title"), text: t("services.step3Text") },
  ];

  return (
    <div>
      {/* ─── Worker request modal ─── */}
      {selectedWorker && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedWorker(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-7 shadow-2xl sm:p-9"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-[#C9A96E] font-display font-semibold text-white">
                  {selectedWorker.name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display text-xl text-[#1A1A1A]">{selectedWorker.name}</h3>
                  <p className="text-sm font-medium text-[#8B7355]">{selectedWorker.trade}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorker(null)}
                className="rounded-full p-2 text-[#9B9590] transition hover:bg-[#FAF8F5] hover:text-[#1A1A1A]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#6B6560]">
              <span className="flex items-center gap-1.5">
                <MapPin size={13} /> {selectedWorker.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Star size={13} className="fill-[#C9A96E] text-[#C9A96E]" /> {selectedWorker.rating.toFixed(1)}
              </span>
              <span className="flex items-center gap-1.5">
                <BadgeCheck size={13} className="text-[#C9A96E]" /> {selectedWorker.jobsCompleted}+ {t("services.jobsDone")}
              </span>
            </div>

            <div className="mt-6 border-t border-[#E8E2DB] pt-6">
              <p className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#6B6560]">
                {t("services.requestFor", { name: selectedWorker.name })}
              </p>
              <ServiceRequestForm
                key={selectedWorker.id}
                initialTrade={selectedWorker.trade}
                onSuccess={() => setSelectedWorker(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Hero ─── */}
      <section className="bg-[#1A1A1A] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C9A96E]">
              <HardHat size={14} />
              {t("services.heroEyebrow")}
            </p>
            <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              {t("services.heroTitle")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">{t("services.heroText")}</p>

            {/* Trust row */}
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/60">
              {[t("services.heroTrust1"), t("services.heroTrust2"), t("services.heroTrust3")].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <BadgeCheck size={16} className="text-[#C9A96E]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Category cards ─── */}
      <section className="mx-auto -mt-10 max-w-7xl px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {serviceCategories.map((cat) => {
            const Icon = categoryMeta[cat.id].icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  document.getElementById("directory")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group rounded-2xl border border-[#E8E2DB] bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#C9A96E] hover:shadow-lg"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#C9A96E]/10 text-[#8B7355] transition group-hover:bg-[#C9A96E] group-hover:text-white">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 font-display text-lg text-[#1A1A1A]">{t(cat.labelKey)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#6B6560]">{t(categoryMeta[cat.id].descKey)}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[#C9A96E]">
                  {cat.trades.length} {t("services.trades")} →
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Directory ─── */}
      <section id="directory" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-16 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#C9A96E]">{t("services.directoryEyebrow")}</p>
            <h2 className="mt-2 font-display text-3xl text-[#1A1A1A]">{t("services.directoryTitle")}</h2>
          </div>
          <div className="relative sm:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9B9590]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("services.searchPlaceholder")}
              className="w-full rounded-full border border-[#E8E2DB] bg-white py-2.5 pl-11 pr-4 text-sm text-[#1A1A1A] outline-none transition placeholder:text-[#9B9590] focus:border-[#C9A96E] focus:ring-2 focus:ring-[#C9A96E]/20"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="mt-8 flex flex-wrap gap-2.5">
          {categoryChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveCategory(chip.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeCategory === chip.id
                  ? "bg-[#1A1A1A] text-white"
                  : "border border-[#E8E2DB] bg-white text-[#6B6560] hover:border-[#C9A96E] hover:text-[#1A1A1A]"
              }`}
            >
              {chip.label} <span className="opacity-60">({chip.count})</span>
            </button>
          ))}
        </div>

        {/* Worker grid */}
        {workers.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workers.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} onRequest={setSelectedWorker} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-[#E8E2DB] bg-white/60 px-6 py-16 text-center">
            <Search size={28} className="mx-auto text-[#9B9590]" />
            <p className="mt-4 font-display text-xl text-[#1A1A1A]">{t("services.noWorkers")}</p>
            <p className="mt-2 text-sm text-[#6B6560]">{t("services.noWorkersText")}</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setActiveCategory("all");
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#C9A96E]"
            >
              {t("services.clearFilters")}
            </button>
          </div>
        )}
      </section>

      {/* ─── How it works ─── */}
      <section className="bg-[#F7F3EB] py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-[#C9A96E]">{t("services.howItWorksEyebrow")}</p>
            <h2 className="mt-2 font-display text-3xl text-[#1A1A1A]">{t("services.howItWorksTitle")}</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {howItWorks.map((step, i) => (
              <div key={step.title} className="relative rounded-2xl border border-[#E8E2DB] bg-white p-7 text-center shadow-sm">
                <span className="absolute -top-4 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full bg-[#C9A96E] font-display text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div className="mx-auto mt-2 flex size-12 items-center justify-center rounded-full bg-[#1A1A1A] text-[#C9A96E]">
                  <step.icon size={22} />
                </div>
                <h3 className="mt-4 font-display text-xl text-[#1A1A1A]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6560]">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Request a worker ─── */}
      <section id="request-a-worker" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#C9A96E]">{t("services.requestEyebrow")}</p>
            <h2 className="mt-2 font-display text-3xl text-[#1A1A1A]">{t("services.requestTitle")}</h2>
            <p className="mt-4 text-base leading-relaxed text-[#6B6560]">{t("services.requestText")}</p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: CalendarClock, text: t("services.requestBullet1") },
                { icon: Phone, text: t("services.requestBullet2") },
                { icon: ShieldCheck, text: t("services.requestBullet3") },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-[#1A1A1A]">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#C9A96E]/10 text-[#8B7355]">
                    <Icon size={16} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border border-[#E8E2DB] bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6B6560]">
                <MapPin size={14} className="text-[#C9A96E]" />
                {t("services.servingAreas")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#6B6560]">{t("services.servingAreasText")}</p>
            </div>
          </div>
          <div className="rounded-[28px] border border-[#E8E2DB] bg-white p-7 shadow-sm sm:p-9">
            <h3 className="font-display text-2xl text-[#1A1A1A]">{t("services.requestFormTitle")}</h3>
            <p className="mt-2 mb-6 text-sm text-[#6B6560]">{t("services.requestFormText")}</p>
            <ServiceRequestForm />
          </div>
        </div>
      </section>

      {/* ─── List your service ─── */}
      <section id="list-your-service" className="scroll-mt-28 bg-[#1A1A1A] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C9A96E]">
                <HardHat size={14} />
                {t("services.registerEyebrow")}
              </p>
              <h2 className="font-display text-3xl text-white sm:text-4xl">{t("services.registerTitle")}</h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/70">{t("services.registerText")}</p>
              <div className="mt-8 space-y-3">
                {[t("services.registerBullet1"), t("services.registerBullet2"), t("services.registerBullet3")].map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm text-white/80">
                    <BadgeCheck size={17} className="mt-0.5 shrink-0 text-[#C9A96E]" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] bg-white p-7 shadow-2xl sm:p-9">
              <h3 className="font-display text-2xl text-[#1A1A1A]">{t("services.registerFormTitle")}</h3>
              <p className="mt-2 mb-6 text-sm text-[#6B6560]">{t("services.registerFormText")}</p>
              <ServiceRegisterForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ServicesPageWrapper() {
  return (
    <Suspense>
      <ServicesPage />
    </Suspense>
  );
}
