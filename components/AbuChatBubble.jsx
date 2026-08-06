"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import AbuChat from "@/components/AbuChat";

export default function AbuChatBubble() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[360px] max-w-[calc(100vw-2rem)] rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between gap-3 rounded-t-[2rem] border-b border-slate-200 bg-[#F7E7C9] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C9A96E] text-white font-bold">ABU</div>
              <div>
                <p className="text-sm font-semibold text-slate-900">ABU Support</p>
                <p className="text-xs text-slate-600">AI chat assistant</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <div className="p-4">
            <AbuChat />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A96E] text-white shadow-2xl transition hover:bg-[#b18d45]"
        aria-label="Open ABU chat"
      >
        <MessageCircle size={26} />
      </button>
    </div>
  );
}
