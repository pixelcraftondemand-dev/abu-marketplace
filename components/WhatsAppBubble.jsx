"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import {
  buildSupportMessage,
  buildSupportWhatsAppLink,
  getSupportWhatsAppNumber,
} from "@/lib/utils/whatsapp";

/**
 * Site-wide WhatsApp button.
 *
 * Sierra Leone's buyers already close deals on WhatsApp (BuyNow SL's whole
 * checkout is one wa.me link), so a persistent, prefilled entry point converts
 * better than a checkout form on a slow connection. The number is read from
 * NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER — the component renders nothing when it
 * is unset, so environments without a WhatsApp line are unaffected.
 *
 * Sits bottom-left to stay clear of the ABU support bubble (bottom-right) and
 * is raised above the mobile bottom tab bar. Hidden on operator surfaces
 * (admin / store console / agent / Studio).
 */

const HIDDEN_PREFIXES = ["/admin", "/store", "/agent", "/studio", "/monitoring"];

export default function WhatsAppBubble() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(window.sessionStorage.getItem("abu-whatsapp-bubble-dismissed") === "1");
    } catch {
      // Storage unavailable (private mode) — the bubble just shows again.
    }
  }, []);

  if (!mounted) return null;

  // strip the /en //kri locale prefix before deciding
  const path = (pathname || "/").replace(/^\/(en|kri)(?=\/|$)/, "") || "/";
  if (HIDDEN_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return null;
  }
  if (dismissed) return null;
  if (!getSupportWhatsAppNumber()) return null;

  const href = buildSupportWhatsAppLink(buildSupportMessage());

  if (!href) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem("abu-whatsapp-bubble-dismissed", "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed left-4 bottom-24 z-40 flex items-center gap-1.5 sm:bottom-6">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-[#0B3D2E] shadow-[0_10px_30px_-6px_rgba(11,61,46,0.45)] transition-transform duration-150 hover:scale-[1.03] active:scale-95"
        aria-label="Order or ask questions on WhatsApp"
      >
        <MessageCircle size={18} strokeWidth={2.2} aria-hidden="true" />
        Chat on WhatsApp
      </a>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Hide the WhatsApp button"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-400 shadow-sm transition hover:text-gray-700"
      >
        <X size={14} />
      </button>
    </div>
  );
}
