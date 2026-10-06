"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bot, Headset, LoaderCircle, Send, X } from "lucide-react";

const quickPrompts = ["Track an order", "Returns & refunds", "Mobile money", "Delivery help"];
const welcomeMessage = "Hi, I’m ABU. I can help with orders, returns, payments, or delivery. Pick a topic or tell me what’s going on.";

export function AbuMascot({ size = "normal" }) {
  const compact = size === "small";

  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center rounded-xl bg-[#D9F3E8] text-[#123B35] ${compact ? "h-9 w-9" : "h-11 w-11"}`}
    >
      <Bot size={compact ? 21 : 25} strokeWidth={2.2} />
      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#F06A3B]" />
    </span>
  );
}

function TypingIndicator() {
  return (
    <span className="flex items-center gap-1.5" aria-label="ABU is typing">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#246B60]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#246B60] [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#246B60] [animation-delay:300ms]" />
    </span>
  );
}

export default function AbuChat({ embedded = false }) {
  const [messages, setMessages] = useState([{ from: "abu", text: welcomeMessage }]);
  const [ticketId, setTicketId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [escalationText, setEscalationText] = useState("");
  const [escalationError, setEscalationError] = useState("");
  const [escalated, setEscalated] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, escalationOpen]);

  const send = async (messageText = input, isRetry = false) => {
    const text = messageText.trim();
    if (!text || loading) return;

    const priorMessages = messages;
    setMessages((current) => [...current, { from: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const historyMessages = priorMessages.filter((message) => !message.retryText);
      if (isRetry && historyMessages.at(-1)?.from === "user" && historyMessages.at(-1)?.text === text) {
        historyMessages.pop();
      }

      const res = await fetch("/api/support/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyMessages.map((message) => ({
            role: message.from === "abu" ? "assistant" : "user",
            content: message.text,
          })),
          ticketId,
          accessToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ticketId) setTicketId(data.ticketId);
      if (data.accessToken) setAccessToken(data.accessToken);

      if (!res.ok) {
        setMessages((current) => [...current, {
          from: "abu",
          text: data.reply || data.error || "I couldn’t get that through just now. Please try again.",
          retryText: text,
        }]);
        return;
      }

      setMessages((current) => [...current, { from: "abu", text: data.reply || "I don’t have an answer yet. Try rephrasing, or ask for a person." }]);
    } catch {
      setMessages((current) => [...current, {
        from: "abu",
        text: "I can’t reach support right now. Your message is still here; try again in a moment or contact a person.",
        retryText: text,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const escalate = async (event) => {
    event.preventDefault();
    const text = escalationText.trim();
    if (!ticketId || !text || loading) return;

    setLoading(true);
    setEscalationError("");
    try {
      const res = await fetch("/api/support/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message: text, accessToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setEscalationError(data.error || "We couldn’t send this to support. Please try again.");
        return;
      }
      setMessages((current) => [...current, { from: "abu", text: "I’ve sent this conversation to the support team. They’ll review it soon." }]);
      setEscalated(true);
      setEscalationOpen(false);
      setEscalationText("");
    } catch {
      setEscalationError("We couldn’t reach support. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const frameClass = embedded
    ? "flex h-full min-h-0 w-full flex-col overflow-hidden bg-white"
    : "flex h-[560px] max-h-[75dvh] min-h-[420px] w-full flex-col overflow-hidden rounded-lg border border-[#D9E2DF] bg-white shadow-sm";

  return (
    <section className={frameClass} aria-label="ABU customer support chat">
      {!embedded && (
        <div className="flex items-center gap-3 border-b border-[#D9E2DF] px-4 py-3">
          <AbuMascot />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#172A27]">ABU</h2>
              <span className="rounded bg-[#E8F5EF] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#246B60]">Assistant</span>
            </div>
            <p className="mt-0.5 text-xs text-[#64736F]">Marketplace support · Replies instantly</p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-[#246B60]">
            <span className="h-2 w-2 rounded-full bg-[#43A77D]" /> Online
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col bg-[#F5F8F6]">
        <div className="border-b border-[#E3EAE7] px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#73817D]">Popular topics</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => send(prompt)}
                disabled={loading}
                className="shrink-0 rounded-md border border-[#CCD9D4] bg-white px-2.5 py-1.5 text-xs font-medium text-[#29453F] transition hover:border-[#246B60] hover:bg-[#EAF4EF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div ref={listRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {messages.map((message, index) => (
            <div key={`${index}-${message.from}`} className={`flex items-end gap-2 ${message.from === "user" ? "justify-end" : "justify-start"}`}>
              {message.from === "abu" && <AbuMascot size="small" />}
              <div className={`max-w-[84%] ${message.from === "user" ? "text-right" : "text-left"}`}>
                <p className={`mb-1 text-[10px] font-medium text-[#73817D] ${message.from === "user" ? "mr-1" : "ml-1"}`}>
                  {message.from === "user" ? "You" : "ABU"}
                </p>
                <div className={`rounded-lg px-3 py-2.5 text-[13px] leading-relaxed ${message.from === "user" ? "rounded-br-sm bg-[#17483F] text-white" : "rounded-bl-sm border border-[#DEE7E2] bg-white text-[#263A35]"}`}>
                  {message.text}
                </div>
                {message.retryText && (
                  <button type="button" onClick={() => send(message.retryText, true)} disabled={loading} className="mt-1.5 text-xs font-semibold text-[#246B60] underline decoration-[#9ABCAF] underline-offset-2 hover:text-[#17483F] disabled:opacity-50">
                    Try again
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-end gap-2" role="status" aria-label="ABU is replying">
              <AbuMascot size="small" />
              <div className="rounded-lg rounded-bl-sm border border-[#DEE7E2] bg-white px-3 py-3"><TypingIndicator /></div>
            </div>
          )}
        </div>

        <div className="border-t border-[#E3EAE7] bg-white px-3.5 pb-3 pt-2.5">
          {escalationOpen ? (
            <form onSubmit={escalate} className="mb-2 rounded-md border border-[#D9E2DF] bg-[#F8FAF9] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="abu-escalation" className="text-xs font-semibold text-[#263A35]">What should our support team know?</label>
                <button type="button" onClick={() => { setEscalationOpen(false); setEscalationError(""); }} className="rounded p-1 text-[#64736F] hover:bg-[#EAF0ED]" aria-label="Close human support form"><X size={15} /></button>
              </div>
              <textarea id="abu-escalation" value={escalationText} onChange={(event) => setEscalationText(event.target.value)} maxLength={4000} rows={3} required disabled={loading} className="w-full resize-y rounded border border-[#CCD9D4] bg-white px-2.5 py-2 text-sm text-[#263A35] outline-none focus:border-[#246B60] focus:ring-2 focus:ring-[#246B60]/15 disabled:opacity-60" placeholder="Add any details that could help…" />
              {escalationError && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{escalationError}</p>}
              <div className="mt-2 flex justify-end">
                <button type="submit" disabled={loading || !escalationText.trim()} className="inline-flex items-center gap-2 rounded-md bg-[#17483F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#103B34] disabled:cursor-not-allowed disabled:opacity-50">
                  {loading && <LoaderCircle size={14} className="animate-spin" />}
                  Send to support
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
              <p className="text-[10px] text-[#73817D]">Don’t share passwords or payment details.</p>
              {escalated ? (
                <span className="text-[11px] font-medium text-[#246B60]">Sent to support</span>
              ) : ticketId ? (
                <button type="button" onClick={() => setEscalationOpen(true)} disabled={loading} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#246B60] hover:text-[#17483F] disabled:opacity-50">
                  <Headset size={14} /> Talk to a person <ArrowUpRight size={12} />
                </button>
              ) : (
                <span className="shrink-0 text-[10px] text-[#73817D]">A person is one message away</span>
              )}
            </div>
          )}

          <form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex items-end gap-2 rounded-md border border-[#CCD9D4] bg-white p-1.5 transition focus-within:border-[#246B60] focus-within:ring-2 focus-within:ring-[#246B60]/15">
            <label htmlFor="abu-message" className="sr-only">Message ABU</label>
            <textarea
              ref={inputRef}
              id="abu-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={2000}
              rows={1}
              disabled={loading}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Write a message…"
              className="max-h-24 min-h-9 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-[#263A35] outline-none placeholder:text-[#87948F] disabled:opacity-60"
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#E86A3D] text-white transition hover:bg-[#C95430] disabled:cursor-not-allowed disabled:bg-[#DCE4E0] disabled:text-[#86938E]">
              {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
          <p className="mt-1.5 text-right text-[10px] text-[#87948F]">Enter to send · Shift + Enter for a new line</p>
        </div>
      </div>
    </section>
  );
}

