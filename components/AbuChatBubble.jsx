"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, GripHorizontal } from "lucide-react";
import AbuChat, { AbuMascot } from "@/components/AbuChat";

const BUBBLE_SIZE = 56; // h-14 w-14
const EDGE_PADDING = 16;
const DRAG_THRESHOLD = 6; // px of movement before a press becomes a drag

const PANEL_WIDTH = 380;
const PANEL_HEIGHT_ESTIMATE = 640; // used only for the initial placement, before we can measure
const PANEL_GAP = 14;

function getResponsivePanelWidth() {
  if (typeof window === "undefined") return PANEL_WIDTH;
  return Math.min(PANEL_WIDTH, Math.max(0, window.innerWidth - EDGE_PADDING * 2));
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
  const lastBubbleDragAtRef = useRef(0);
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
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort; opening the chat must still work.
    }
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
    if (!drag.moved) return;
    lastBubbleDragAtRef.current = Date.now();
    try {
      window.localStorage.setItem(BUBBLE_STORAGE_KEY, JSON.stringify(bubblePos));
    } catch {
      // Storage unavailable (private mode, quota) — position just won't persist.
    }
  };

  const handleBubbleClick = () => {
    if (Date.now() - lastBubbleDragAtRef.current < 500) return;
    setOpen((current) => !current);
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
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort; panel dragging must not block controls.
    }
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
  const bubblePosition = bubblePos
    ? clampRectToViewport({ ...bubblePos, width: BUBBLE_SIZE, height: BUBBLE_SIZE })
    : null;
  const panelHeight = panelRef.current?.offsetHeight || PANEL_HEIGHT_ESTIMATE;
  const panelPosition = panelPos
    ? clampRectToViewport({ ...panelPos, width: panelWidth, height: panelHeight })
    : null;

  return (
    <>
      {open && panelPosition && (
        <div
          ref={panelRef}
          id="abu-support-chat"
          role="dialog"
          aria-label="ABU support chat"
          className="fixed z-50 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-[0_24px_70px_-12px_rgba(28,25,23,0.35)] animate-in fade-in zoom-in-95 duration-200"
          style={{ left: panelPosition.x, top: panelPosition.y, width: panelWidth, height: "min(680px, calc(100dvh - 32px))", maxWidth: "calc(100vw - 1rem)" }}
        >
          <div
            onPointerDown={handlePanelPointerDown}
            onPointerMove={handlePanelPointerMove}
            onPointerUp={handlePanelPointerUp}
            onPointerCancel={handlePanelPointerCancel}
            className="flex h-16 cursor-grab touch-none items-center justify-between gap-3 border-b border-[#D9E2DF] bg-[#F5F8F6] px-4 active:cursor-grabbing"
          >
            <div className="flex items-center gap-3">
              <AbuMascot />
              <div>
                <p className="text-sm font-semibold text-[#172A27]">ABU Support</p>
                <p className="text-[11px] text-[#64736F]">Your marketplace assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[#64736F]">
              <span className="mr-1 flex items-center gap-1.5 text-[11px] text-[#246B60]">
                <span className="h-2 w-2 rounded-full bg-[#43A77D]" /> Online
              </span>
              <GripHorizontal size={16} className="opacity-70" aria-hidden="true" />
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1.5 transition hover:bg-[#E4EBE7]"
                aria-label="Close ABU support chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="h-[calc(100%-4rem)]">
            <AbuChat embedded />
          </div>
        </div>
      )}

      <div
        className={`fixed z-50 ${bubblePos ? "" : "right-4 bottom-4"}`}
        style={bubblePosition ? { left: bubblePosition.x, top: bubblePosition.y } : undefined}
      >
        <button
          onClick={handleBubbleClick}
          onPointerDown={handleBubblePointerDown}
          onPointerMove={handleBubblePointerMove}
          onPointerUp={handleBubblePointerUp}
          onPointerCancel={handleBubblePointerCancel}
          className="group relative flex h-14 w-14 cursor-grab touch-none items-center justify-center rounded-full border-2 border-white bg-[#17483F] text-white shadow-[0_10px_30px_-6px_rgba(23,72,63,0.5)] transition-transform duration-150 select-none hover:scale-105 active:cursor-grabbing active:scale-95"
          aria-label="Open ABU chat"
          aria-expanded={open}
          aria-controls="abu-support-chat"
          title="Drag to move · click to open"
        >
          {open ? <X size={24} /> : <AbuMascot />}
          {!open && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#43A77D]" />
          )}
        </button>
      </div>
    </>
  );
}
