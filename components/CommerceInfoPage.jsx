import Link from "next/link";
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";

export default function CommerceInfoPage({
  eyebrow,
  title,
  description,
  stats = [],
  highlights = [],
  sections = [],
  primaryAction,
  secondaryAction,
  footerTitle,
  footerDescription,
}) {
  return (
    <div className="min-h-screen bg-[#f8f5ef] text-slate-800">
      <section className="bg-gradient-to-br from-[#111827] via-[#1b2333] to-[#2f2417] text-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium uppercase tracking-[0.24em] text-[#f3d9a3]">
                <Sparkles size={14} />
                {eyebrow}
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                {description}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {primaryAction && (
                  <Link
                    href={primaryAction.href}
                    className="inline-flex items-center gap-2 rounded-full bg-[#C9A96E] px-5 py-3 text-sm font-semibold text-[#1A1A1A] transition hover:bg-[#d9b77b]"
                  >
                    {primaryAction.label}
                    <ArrowRight size={16} />
                  </Link>
                )}
                {secondaryAction && (
                  <Link
                    href={secondaryAction.href}
                    className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {secondaryAction.label}
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="grid gap-4 sm:grid-cols-2">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-[#0f172a]/40 p-4">
                    <p className="text-3xl font-semibold text-white">{stat.value}</p>
                    <p className="mt-1 text-sm text-slate-300">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {highlights.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon || Sparkles;
              return (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f7ebd3] text-[#b17d2c]">
                    <Icon size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        )}

        {sections.length > 0 && (
          <div className="mt-12 space-y-8">
            {sections.map((section) => (
              <div key={section.title} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#C9A96E]" />
                  <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                </div>
                {section.description && <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{section.description}</p>}
                {section.items && (
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {section.items.map((item) => (
                      <div key={item} className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-[#fcfaf7] p-4 text-sm text-slate-700">
                        <BadgeCheck size={16} className="mt-0.5 shrink-0 text-[#C9A96E]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.24em] text-[#C9A96E]">
                <Truck size={15} />
                Built for modern commerce
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">{footerTitle}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{footerDescription}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {primaryAction && (
                <Link href={primaryAction.href} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                  {primaryAction.label}
                  <ArrowRight size={16} />
                </Link>
              )}
              {secondaryAction && (
                <Link href={secondaryAction.href} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  {secondaryAction.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
