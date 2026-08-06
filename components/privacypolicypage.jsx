"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, Shield, Database, Eye, Lock, Share2, Cookie, UserCheck, Mail, Globe, Trash2 } from "lucide-react";

function normalizeSection(section, index) {
  const baseId = section.id || section.heading || section.title || `section-${index + 1}`;
  const id = String(baseId)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

  return {
    id,
    title: section.title || section.heading || `Section ${index + 1}`,
    content: section.content || (Array.isArray(section.body) ? section.body.join("\n\n") : section.body || ""),
    icon: section.icon || [Shield, Database, Eye, Share2, Lock, Cookie, UserCheck, Globe, Trash2, FileText][index % 10],
  };
}

export default function LegalPage({ title, updated, intro, sections = [] }) {
  const formattedSections = sections.map(normalizeSection);

  return (
    <main className="min-h-screen bg-[#0B0F19]">
      <div className="border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition mb-6"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">{title}</h1>
              {updated && <p className="text-sm text-slate-500">Last Updated: {updated}</p>}
            </div>
          </div>
          {intro && <p className="text-slate-400">{intro}</p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-12 p-6 rounded-2xl bg-[#111827]/60 border border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white mb-4">Table of Contents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {formattedSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <section.icon size={14} />
                {section.title}
              </a>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex gap-3 justify-end">
          <button onClick={() => window.print()} className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white">
            Print / Save as PDF
          </button>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/legal/pdf', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: window.location.href }),
                });
                if (!res.ok) throw new Error('Failed to generate PDF');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = document.title ? document.title.replace(/[^a-z0-9\-_. ]/gi, '_') + '.pdf' : 'document.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error(err);
                alert('Unable to generate PDF. Please try Print/Save as PDF instead.');
              }
            }}
            className="rounded-md bg-[#C9A96E] px-4 py-2 text-sm text-[#1A1A1A]"
          >
            Download PDF
          </button>
        </div>

        <div className="space-y-12">
          {formattedSections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <section.icon size={18} />
                </div>
                <h2 className="text-xl font-bold text-white">{section.title}</h2>
              </div>
              <div className="pl-13 ml-13">
                <div className="p-6 rounded-2xl bg-[#111827]/40 border border-white/[0.04]">
                  <div className="prose prose-invert prose-sm max-w-none">
                    {section.content.split("\n\n").map((paragraph, i) => (
                      <p key={i} className="text-slate-300 leading-relaxed mb-4 last:mb-0 whitespace-pre-line">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
