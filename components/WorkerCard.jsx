"use client";

import { BadgeCheck, MapPin, Star, Wrench } from "lucide-react";
import CurrencyAmount from "@/components/CurrencyAmount";
import { useTranslation } from "@/lib/i18n";

function initialsOf(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const avatarPalette = [
  "bg-[#2D2D2D] text-[#EA580C]",
  "bg-[#EA580C] text-white",
  "bg-[#8B7355] text-white",
  "bg-[#3D3A34] text-[#E8D5A8]",
];

export default function WorkerCard({ worker, onRequest }) {
  const { t } = useTranslation();
  const avatarClass = avatarPalette[(worker.id.length + worker.name.length) % avatarPalette.length];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60">
      {/* Availability badge */}
      <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
        <span className={`size-1.5 rounded-full ${worker.available ? "bg-emerald-500" : "bg-slate-300"}`} />
        {worker.available ? t("services.availableNow") : t("services.availableSoon")}
      </div>

      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className={`flex size-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold ${avatarClass}`}>
          {initialsOf(worker.name)}
        </div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 truncate font-display text-lg text-[#1A1A1A]">
            {worker.name}
            <BadgeCheck size={15} className="shrink-0 text-[#EA580C]" />
          </h3>
          <p className="text-sm font-medium text-[#8B7355]">{worker.trade}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#6B7280]">
            <MapPin size={12} />
            {worker.location}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 divide-x divide-[#E5E7EB] rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] py-3 text-center">
        <div>
          <p className="flex items-center justify-center gap-1 text-sm font-semibold text-[#1A1A1A]">
            <Star size={13} className="fill-[#EA580C] text-[#EA580C]" />
            {worker.rating.toFixed(1)}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#9CA3AF]">{t("services.rating")}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">{worker.jobsCompleted}+</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#9CA3AF]">{t("services.jobsDone")}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">{worker.experienceYears} yrs</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#9CA3AF]">{t("services.experience")}</p>
        </div>
      </div>

      {/* Bio */}
      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-[#6B7280]">{worker.bio}</p>

      {/* Tags */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {worker.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] text-[#6B7280]">
            {tag}
          </span>
        ))}
      </div>

      {/* Footer row */}
      <div className="mt-5 flex items-center justify-between border-t border-[#E5E7EB] pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">{t("services.hourlyRate")}</p>
          <p className="text-sm font-semibold text-[#1A1A1A]">
            <CurrencyAmount amount={worker.hourlyRate} /> <span className="font-normal text-[#9CA3AF]">/hr</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRequest?.(worker)}
          disabled={!worker.available}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
            worker.available
              ? "bg-[#1A1A1A] text-white hover:bg-[#EA580C]"
              : "cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF]"
          }`}
        >
          <Wrench size={14} />
          {t("services.requestWorker")}
        </button>
      </div>
    </article>
  );
}
