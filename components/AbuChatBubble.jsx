"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, GripHorizontal } from "lucide-react";
import AbuChat from "@/components/AbuChat";

const BUBBLE_SIZE = 56; // h-14 w-14
const EDGE_PADDING = 16;
const DRAG_THRESHOLD = 6; // px of movement before a press becomes a drag

const PANEL_WIDTH = 380;
const PANEL_HEIGHT_ESTIMATE = 560; // used only for the initial placement, before we can measure
const PANEL_GAP = 14;

function getResponsivePanelWidth() {
  if (typeof window === "undefined") return PANEL_WIDTH;
  return Math.min(PANEL_WIDTH, window.innerWidth - 16);
}

const BUBBLE_STORAGE_KEY = "abu-chat-bubble-pos";
const PANEL_STORAGE_KEY = "abu-chat-panel-pos";

function loadSavedPosition(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
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

function defaultBubblePosition() {
  if (typeof window === "undefined") return null;
  return {
    x: window.innerWidth - BUBBLE_SIZE - EDGE_PADDING,
    y: window.innerHeight - BUBBLE_SIZE - EDGE_PADDING,
  };
}

function clampRectToViewport({ x, y, width, height }) {
  if (typeof window === "undefined") return { x, y };
  const maxX = window.innerWidth - width - EDGE_PADDING;
  const maxY = window.innerHeight - height - EDGE_PADDING;
  return {
    x: Math.min(Math.max(EDGE_PADDING, x), Math.max(EDGE_PADDING, maxX)),
    y: Math.min(Math.max(EDGE_PADDING, y), Math.max(EDGE_PADDING, maxY)),
  };
}

export default function AbuChatBubble() {
  const [open, setOpen] = useState(false);
  const [bubblePos, setBubblePos] = useState(null);
  const [panelPos, setPanelPos] = useState(null);
  const bubbleDragRef = useRef(null);
  const panelDragRef = useRef(null);
  const panelRef = useRef(null);

  // Start in the bottom-right corner (or the saved spot), then clamp on resize.
  useEffect(() => {
    setBubblePos(loadSavedPosition(BUBBLE_STORAGE_KEY) || defaultBubblePosition());
    const onResize = () => {
      setBubblePos((current) => {
        const base = current || defaultBubblePosition();
        if (!base) return null;
        return clampRectToViewport({ ...base, width: BUBBLE_SIZE, height: BUBBLE_SIZE });
      });
      setPanelPos((current) => {
        if (!current) return current;
        const height = panelRef.current?.offsetHeight || PANEL_HEIGHT_ESTIMATE;
        return clampRectToViewport({ ...current, width: getResponsivePanelWidth(), height });
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The first time the panel opens, anchor it just above the bubble (or the
  // saved spot from a previous drag). After that it's fully user-positioned.
  useEffect(() => {
    if (!open || panelPos) return;
    const saved = loadSavedPosition(PANEL_STORAGE_KEY);
    if (saved) {
      setPanelPos(saved);
      return;
    }
    const anchor = bubblePos || defaultBubblePosition();
    if (!anchor) return;
    const panelWidth = getResponsivePanelWidth();
    setPanelPos(
      clampRectToViewport({
        x: anchor.x + BUBBLE_SIZE - panelWidth,
        y: anchor.y - PANEL_GAP - PANEL_HEIGHT_ESTIMATE,
        width: panelWidth,
        height: PANEL_HEIGHT_ESTIMATE,
      })
    );
  }, [open]);

  // ─── Bubble drag ────────────────────────────────────────────────────────────
  const handleBubblePointerDown = (e) => {
    if (e.button !== 0) return;
    bubbleDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: bubblePos || defaultBubblePosition(),
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleBubblePointerMove = (e) => {
    const drag = bubbleDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    setBubblePos(
      clampRectToViewport({
        x: drag.origin.x + dx,
        y: drag.origin.y + dy,
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
      })
    );
  };

  const handleBubblePointerUp = () => {
    const drag = bubbleDragRef.current;
    if (!drag) return;
    bubbleDragRef.current = null;
    if (!drag.moved) {
      setOpen((current) => !current);
      return;
    }
    try {
      window.localStorage.setItem(BUBBLE_STORAGE_KEY, JSON.stringify(bubblePos));
    } catch {
      // Storage unavailable (private mode, quota) — position just won't persist.
    }
  };

  const handleBubblePointerCancel = () => {
    bubbleDragRef.current = null;
  };

  // ─── Panel drag (grab the header, move the whole conversation) ─────────────
  const handlePanelPointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button")) return; // don't hijack the close button
    panelDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: panelPos,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePanelPointerMove = (e) => {
    const drag = panelDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !drag.origin) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const height = panelRef.current?.offsetHeight || PANEL_HEIGHT_ESTIMATE;
    const width = getResponsivePanelWidth();
    setPanelPos(
      clampRectToViewport({
        x: drag.origin.x + dx,
        y: drag.origin.y + dy,
        width,
        height,
      })
    );
  };

  const handlePanelPointerUp = () => {
    const drag = panelDragRef.current;
    if (!drag) return;
    panelDragRef.current = null;
    if (drag.moved) {
      try {
        window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(panelPos));
      } catch {
        // Storage unavailable — position just won't persist.
      }
    }
  };

  const handlePanelPointerCancel = () => {
    panelDragRef.current = null;
  };

  const panelWidth = getResponsivePanelWidth();

  return (
    <>
      {open && panelPos && (
        <div
          ref={panelRef}
          id="abu-support-chat"
          role="dialog"
          aria-label="ABU support chat"
          className="fixed z-50 overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-white/95 shadow-[0_24px_70px_-12px_rgba(28,25,23,0.35)] backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
          style={{ left: panelPos.x, top: panelPos.y, width: panelWidth, maxWidth: "calc(100vw - 1rem)" }}
        >
          <div
            onPointerDown={handlePanelPointerDown}
            onPointerMove={handlePanelPointerMove}
            onPointerUp={handlePanelPointerUp}
            onPointerCancel={handlePanelPointerCancel}
            className="flex cursor-grab touch-none items-center justify-between gap-3 border-b border-stone-200/80 bg-gradient-to-r from-[#EA580C] to-[#C2410C] px-4 py-3.5 active:cursor-grabbing"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white ring-2 ring-white/30">
                ABU
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#EA580C] bg-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">ABU Support</p>
                <p className="text-[11px] text-white/80">Usually replies in a minute</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-white/70">
              <GripHorizontal size={16} className="opacity-70" />
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-white transition hover:bg-white/20"
                aria-label="Close ABU support chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="p-3.5">
            <AbuChat />
          </div>
        </div>
      )}

      <div
        className={`fixed z-50 ${bubblePos ? "" : "right-4 bottom-4"}`}
        style={bubblePos ? { left: bubblePos.x, top: bubblePos.y } : undefined}
      >
        <button
          onPointerDown={handleBubblePointerDown}
          onPointerMove={handleBubblePointerMove}
          onPointerUp={handleBubblePointerUp}
          onPointerCancel={handleBubblePointerCancel}
          className="group relative flex h-14 w-14 cursor-grab touch-none items-center justify-center rounded-full bg-gradient-to-br from-[#F97316] to-[#C2410C] text-white shadow-[0_10px_30px_-6px_rgba(184,147,90,0.7)] transition-transform duration-150 select-none hover:scale-105 active:cursor-grabbing active:scale-95"
          aria-label="Open ABU chat"
          aria-expanded={open}
          aria-controls="abu-support-chat"
          title="Drag to move · click to open"
        >
          {open ? <X size={24} /> : <MessageCircle size={24} />}
          {!open && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
          )}
        </button>
      </div>
    </>
  );
}
