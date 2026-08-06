'use client'

import { useEffect, useState } from "react";
import axios from "axios";
import { Bell, MessageSquare, Sheet, ShieldCheck } from "lucide-react";
import Loading from "@/components/Loading";

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState("");

  const fetchTickets = async () => {
    try {
      const { data } = await axios.get('/api/admin/support-tickets');
      setTickets(data.tickets || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const selectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setReply("");
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;
    try {
      await axios.post('/api/admin/support-reply', { ticketId: selectedTicket.id, reply: reply.trim() });
      setReply("");
      fetchTickets();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-8 pb-20">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#C9A96E]">Support inbox</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">ABU support tickets</h1>
            <p className="mt-2 text-sm text-slate-500">Review escalated tickets and reply directly to customers.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FEF7E8] px-4 py-3 text-sm text-[#7A5B23]">
            <Bell size={18} /> {tickets.length} tickets
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Tickets</h2>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => selectTicket(ticket)}
                className={`w-full rounded-3xl border p-4 text-left transition ${selectedTicket?.id === ticket.id ? 'border-[#C9A96E] bg-[#FEF7E8]' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{ticket.subject}</p>
                    <p className="text-xs text-slate-500">{ticket.status}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600 line-clamp-2">{ticket.latestMessage || 'No messages yet.'}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          {selectedTicket ? (
            <>
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-lg font-semibold text-slate-900">Ticket details</p>
                  <p className="text-sm text-slate-500">Ticket ID: {selectedTicket.id}</p>
                </div>
                <span className="rounded-full bg-[#E8F8F4] px-3 py-1 text-sm text-[#12735D]">{selectedTicket.status}</span>
              </div>

              <div className="space-y-4 mb-6">
                {selectedTicket.messages.map((msg) => (
                  <div key={msg.id} className={`rounded-3xl p-4 ${msg.sender === 'user' ? 'bg-slate-50 text-slate-800' : 'bg-[#F3E4C3] text-slate-900'}`}>
                    <div className="flex items-center justify-between gap-3 mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                      <span>{msg.sender}</span>
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm leading-6">{msg.content}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
                  placeholder="Write a reply to the customer..."
                />
                <button onClick={sendReply} className="inline-flex items-center gap-2 rounded-full bg-[#C9A96E] px-5 py-3 text-sm font-semibold text-[#1A1A1A] transition hover:bg-[#bfa469]">
                  Send reply
                </button>
              </div>
            </>
          ) : (
            <div className="text-slate-500">Select a ticket to view details and reply.</div>
          )}
        </div>
      </div>
    </div>
  );
}
