"use client";

import { useEffect, useRef, useState } from "react";
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
 * Starts bottom-left to stay clear of the ABU support bubble and is raised
 * above the mobile bottom tab bar. Buyers can drag it elsewhere; its position
 * is saved between visits. Hidden on operator surfaces (admin / store console /
 * agent / Studio).
 */

const HIDDEN_PREFIXES = ["/admin", "/store", "/agent", "/studio", "/monitoring"];
const POSITION_STORAGE_KEY = "abu-whatsapp-bubble-pos";
const EDGE_PADDING = 16;
const DRAG_THRESHOLD = 6;

function clampPosition(position, width, height) {
  const maxX = window.innerWidth - width - EDGE_PADDING;
  const maxY = window.innerHeight - height - EDGE_PADDING;
  return {
    x: Math.min(Math.max(EDGE_PADDING, position.x), Math.max(EDGE_PADDING, maxX)),
    y: Math.min(Math.max(EDGE_PADDING, position.y), Math.max(EDGE_PADDING, maxY)),
  };
}

export default function WhatsAppBubble() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState(null);
  const bubbleRef = useRef(null);
  const dragRef = useRef(null);
  const lastDragAtRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(window.sessionStorage.getItem("abu-whatsapp-bubble-dismissed") === "1");
    } catch {
      // Storage unavailable (private mode) — the bubble just shows again.
    }
  }, []);

  useEffect(() => {
    if (!mounted || !bubbleRef.current) return;

    try {
      const saved = JSON.parse(window.localStorage.getItem(POSITION_STORAGE_KEY));
      if (typeof saved?.x === "number" && typeof saved?.y === "number") {
        const { width, height } = bubbleRef.current.getBoundingClientRect();
        setPosition(clampPosition(saved, width, height));
      }
    } catch {
      // Corrupt or unavailable storage — keep the default corner position.
    }
  }, [mounted]);

  useEffect(() => {
    if (!position) return;

    const handleResize = () => {
      const bounds = bubbleRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setPosition((current) => current && clampPosition(current, bounds.width, bounds.height));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [position]);

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

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    const bounds = bubbleRef.current?.getBoundingClientRect();
    if (!bounds) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: { x: bounds.left, y: bounds.top },
      moved: false,
      position: null,
    };
    try {
      const captureTarget = event.target.closest?.("a, button") || event.currentTarget;
      captureTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; the link remains usable without it.
    }
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    drag.moved = true;
    const bounds = bubbleRef.current?.getBoundingClientRect();
    if (!bounds) return;
    drag.position = clampPosition(
      { x: drag.origin.x + dx, y: drag.origin.y + dy },
      bounds.width,
      bounds.height
    );
    setPosition(drag.position);
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.moved || !drag.position) return;

    lastDragAtRef.current = Date.now();
    try {
      window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(drag.position));
    } catch {
      // Storage unavailable — the position lasts until the page is reloaded.
    }
  };

  const handlePointerCancel = () => {
    dragRef.current = null;
  };

  const preventClickAfterDrag = (event) => {
    if (Date.now() - lastDragAtRef.current < 500) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div
      ref={bubbleRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={preventClickAfterDrag}
      className={`fixed z-40 flex touch-none select-none items-center gap-1.5 ${
        position ? "" : "left-4 bottom-24 sm:bottom-6"
      }`}
      style={position ? { left: position.x, top: position.y } : undefined}
      title="Drag to move"
    >
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
