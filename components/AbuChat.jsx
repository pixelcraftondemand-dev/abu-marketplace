"use client";

import { useState, useRef } from "react";
import { Send, Sparkles, ArrowUpRight } from "lucide-react";

const quickPrompts = [
  "Track my order",
  "Return an item",
  "Pay with mobile money",
  "Help with delivery",
];

export default function AbuChat() {
  const [messages, setMessages] = useState([
    { from: "abu", text: "Hi — I’m ABU, your support assistant. I can help with orders, returns, payments, and delivery questions." },
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
      setMessages((m) => [...m, { from: "abu", text: reply }]);
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { from: "abu", text: "Sorry — I couldn’t reach support right now. Please try again shortly." }]);
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
    <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7E7C9] font-bold text-[#7a4d13]">ABU</div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">ABU Support Assistant</h3>
          <p className="text-xs text-slate-500">Orders, returns, payments, and delivery help</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => send(prompt)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[#C9A96E] hover:bg-[#FFF7E8]"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div ref={listRef} className="mb-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "abu" ? "justify-start" : "justify-end"}`}>
            <div className={`${m.from === "abu" ? "bg-white text-slate-800" : "bg-[#C9A96E] text-[#1A1A1A]"} max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#C9A96E]" />
                ABU is typing…
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Describe your issue..."
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-[#C9A96E]"
        />
        <button onClick={() => send()} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl bg-[#C9A96E] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#b18d45] disabled:opacity-70">
          <Send size={15} />
          {loading ? "Thinking" : "Send"}
        </button>
      </div>

      <button onClick={escalate} disabled={loading} className="mt-2 flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900">
        Escalate to human support
        <ArrowUpRight size={14} />
      </button>
    </div>
  );
}
