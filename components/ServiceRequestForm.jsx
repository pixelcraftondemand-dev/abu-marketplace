"use client";

import { useState } from "react";
import axios from "axios";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { allTrades } from "@/lib/servicesData";

const EMPTY = { name: "", phone: "", email: "", location: "", trade: "", jobDate: "", details: "" };

export default function ServiceRequestForm({ initialTrade = "", onSuccess }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ ...EMPTY, trade: initialTrade || "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ state: "loading", message: "" });
    try {
      const { data } = await axios.post("/api/services/request", form);
      if (data.success) {
        setStatus({ state: "success", message: t("services.requestSuccess") });
        setForm({ ...EMPTY, trade: initialTrade || "" });
        onSuccess?.();
      }
    } catch (error) {
      setStatus({
        state: "error",
        message: error.response?.data?.error || t("services.requestError"),
      });
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[#E8E2DB] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none transition placeholder:text-[#9B9590] focus:border-[#C9A96E] focus:ring-2 focus:ring-[#C9A96E]/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label={t("services.requestTitle")}>
      {status.state === "success" && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
          {status.message}
        </div>
      )}
      {status.state === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{status.message}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6B6560]">
            {t("services.formName")} *
          </label>
          <input required value={form.name} onChange={set("name")} className={inputClass} placeholder={t("services.formNamePlaceholder")} maxLength={100} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6B6560]">
            {t("services.formPhone")} *
          </label>
          <input required value={form.phone} onChange={set("phone")} className={inputClass} placeholder="+232 ..." maxLength={40} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6B6560]">
            {t("services.formEmail")}
          </label>
          <input type="email" value={form.email} onChange={set("email")} className={inputClass} placeholder="you@example.com" maxLength={160} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6B6560]">
            {t("services.formLocation")} *
          </label>
          <input required value={form.location} onChange={set("location")} className={inputClass} placeholder={t("services.formLocationPlaceholder")} maxLength={120} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6B6560]">
            {t("services.formTrade")} *
          </label>
          <select required value={form.trade} onChange={set("trade")} className={inputClass}>
            <option value="">{t("services.formTradePlaceholder")}</option>
            {allTrades.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6B6560]">
            {t("services.formJobDate")}
          </label>
          <input value={form.jobDate} onChange={set("jobDate")} className={inputClass} placeholder={t("services.formJobDatePlaceholder")} maxLength={60} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6B6560]">
          {t("services.formDetails")}
        </label>
        <textarea
          rows={4}
          value={form.details}
          onChange={set("details")}
          className={`${inputClass} resize-none`}
          placeholder={t("services.formDetailsPlaceholder")}
          maxLength={2000}
        />
      </div>

      <button
        type="submit"
        disabled={status.state === "loading"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#C9A96E] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#A88B52] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status.state === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {t("services.submitRequest")}
      </button>
    </form>
  );
}
