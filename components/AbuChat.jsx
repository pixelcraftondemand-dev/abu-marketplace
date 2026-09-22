"use client";

import { useState, useRef } from "react";
import { Send, ArrowUpRight } from "lucide-react";
import { Bubble, BubbleContent } from "@/components/ui/bubble";

const quickPrompts = [
  "Track my order",
  "Return an item",
  "Pay with mobile money",
  "Help with delivery",
];

function TypingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-stone-400"
          style={{ animation: "abu-bounce 1.1s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <style jsx>{`
        @keyframes abu-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

export default function AbuChat() {
  const [messages, setMessages] = useState([
    { from: "abu", text: "Hi — I'm ABU, your support assistant. I can help with orders, returns, payments, and delivery questions." },
  ]);
  const [ticketId, setTicketId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const send = async (messageText = input.trim()) => {
    if (!messageText) return;
    const userMsg = { from: "user", text: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/support/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          history: newMessages.map((m) => ({ role: m.from === "abu" ? "assistant" : "user", content: m.text })),
          ticketId,
          accessToken,
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || "Sorry, something went wrong.";
      if (data.ticketId) setTicketId(data.ticketId);
      if (data.accessToken) setAccessToken(data.accessToken);
      if (!res.ok) {
        const prefix = res.status === 503 ? "" : "Sorry — ";
        setMessages((m) => [...m, { from: "abu", text: `${prefix}${reply}.` }]);
        return;
      }
      setMessages((m) => [...m, { from: "abu", text: reply }]);
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { from: "abu", text: "Sorry — I couldn't reach support right now. Please try again shortly." }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
    }
  };

  const escalate = async () => {
    if (!ticketId) {
      alert("Please send one message first so we can create a support ticket.");
      return;
    }
    const message = prompt("Please describe your issue for human support.");
    if (!message?.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/support/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message, accessToken }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((m) => [...m, { from: "abu", text: "Your request has been escalated to human support. Someone will review it soon." }]);
      } else {
        throw new Error(data.error || "Escalation failed");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to escalate to human support. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => send(prompt)}
            className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-[#EA580C] hover:bg-[#FFF7ED] hover:text-stone-900"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div
        ref={listRef}
        className="mb-3 flex max-h-[340px] min-h-[220px] flex-col gap-2.5 overflow-y-auto rounded-2xl bg-stone-50/70 p-3.5"
      >
        {messages.map((m, i) => (
          <Bubble key={i} align={m.from === "abu" ? "start" : "end"}>
            <BubbleContent
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm ${
                m.from === "abu"
                  ? "rounded-bl-md border border-stone-200 bg-white text-stone-800"
                  : "rounded-br-md border-transparent bg-gradient-to-br from-[#F97316] to-[#C2410C] text-white"
              }`}
            >
              {m.text}
            </BubbleContent>
          </Bubble>
        ))}
        {loading && (
          <Bubble align="start">
            <BubbleContent className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-3.5 py-2.5 text-stone-500">
              <TypingDots />
            </BubbleContent>
          </Bubble>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-full border border-stone-300 bg-white pl-4 pr-1.5 py-1.5 transition focus-within:border-[#EA580C] focus-within:ring-2 focus-within:ring-[#EA580C]/20">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Describe your issue..."
          className="flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EA580C] text-white transition hover:bg-[#C2410C] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </div>

      <button
        onClick={escalate}
        disabled={loading}
        className="mt-2.5 flex items-center gap-1 self-start text-xs font-medium text-stone-500 transition hover:text-stone-900"
      >
        Escalate to human support
        <ArrowUpRight size={13} />
      </button>
    </div>
  );
}

