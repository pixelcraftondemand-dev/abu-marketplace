"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import AbuChat from "@/components/AbuChat";

const BUBBLE_SIZE = 56; // h-14 w-14
const EDGE_PADDING = 16;
const DRAG_THRESHOLD = 6; // px of movement before a press becomes a drag

const STORAGE_KEY = "abu-chat-bubble-pos";

function loadSavedPosition() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
      return parsed;
    }
  } catch {
    // Corrupt/unreadable saved position — fall back to the default corner.
  }
  return null;
}

function defaultPosition() {
  if (typeof window === "undefined") return null;
  return {
    x: window.innerWidth - BUBBLE_SIZE - EDGE_PADDING,
    y: window.innerHeight - BUBBLE_SIZE - EDGE_PADDING,
  };
}

export default function AbuChatBubble() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null); // { x, y } top-left of the bubble
  const dragRef = useRef(null); // pointer state while dragging

  // Start in the bottom-right corner (or the saved spot), then clamp on resize.
  useEffect(() => {
    setPosition(loadSavedPosition() || defaultPosition());
    const onResize = () => {
      setPosition((current) => {
        const base = current || defaultPosition();
        if (!base) return null;
        return clampToViewport(base);
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const clampToViewport = useCallback(({ x, y }) => {
    if (typeof window === "undefined") return { x, y };
    const maxX = window.innerWidth - BUBBLE_SIZE - EDGE_PADDING;
    const maxY = window.innerHeight - BUBBLE_SIZE - EDGE_PADDING;
    return {
      x: Math.min(Math.max(EDGE_PADDING, x), Math.max(EDGE_PADDING, maxX)),
      y: Math.min(Math.max(EDGE_PADDING, y), Math.max(EDGE_PADDING, maxY)),
    };
  }, []);

  // ─── Drag handling ──────────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    // Left button (or touch/pen). Middle/right clicks keep their default
    // browser behavior and never start a drag.
    if (e.button !== 0) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: position || defaultPosition(),
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return; // still a click
    drag.moved = true;
    setPosition(clampToViewport({ x: drag.origin.x + dx, y: drag.origin.y + dy }));
  };

  const handlePointerUp = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    // A press without movement is a click — toggle the panel.
    if (!drag.moved) {
      setOpen((current) => !current);
      return;
    }
    // Finished a drag — persist so the position survives reloads.
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch {
      // Storage unavailable (private mode, quota) — position just won't persist.
    }
  };

  const handlePointerCancel = () => {
    dragRef.current = null;
  };

  return (
    <div
      className="fixed z-50"
      style={{
        left:
          position?.x ??
          (typeof window !== "undefined" ? window.innerWidth - BUBBLE_SIZE - EDGE_PADDING : undefined),
        top:
          position?.y ??
          (typeof window !== "undefined" ? window.innerHeight - BUBBLE_SIZE - EDGE_PADDING : undefined),
      }}
    >
      {open && (
        <div
          id="abu-support-chat"
          role="dialog"
          aria-label="ABU support chat"
          className="absolute bottom-full right-0 mb-3 w-[360px] max-w-[calc(100vw-2rem)] rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-center justify-between gap-3 rounded-t-[2rem] border-b border-slate-200 bg-[#F7E7C9] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C9A96E] text-white font-bold">ABU</div>
              <div>
                <p className="text-sm font-semibold text-slate-900">ABU Support</p>
                <p className="text-xs text-slate-600">AI chat assistant</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100" aria-label="Close ABU support chat">
              <X size={18} />
            </button>
          </div>
          <div className="p-4">
            <AbuChat />
          </div>
        </div>
      )}

      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="flex h-14 w-14 cursor-grab touch-none items-center justify-center rounded-full bg-[#C9A96E] text-white shadow-2xl transition select-none hover:bg-[#b18d45] active:cursor-grabbing"
        aria-label="Open ABU chat"
        aria-expanded={open}
        aria-controls="abu-support-chat"
        title="Drag to move · click to open"
      >
        <MessageCircle size={26} />
      </button>
    </div>
  );
}
