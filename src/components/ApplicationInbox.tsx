import React from 'react';
import { CheckCircle2, ClipboardList, Inbox, MailOpen, X, XCircle } from 'lucide-react';
import type { ApplicationInboxMessage } from '../lib/applicationInbox';

interface ApplicationInboxProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ApplicationInboxMessage[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onOpenApplications: () => void;
}

const formatMessageDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
};

/** The merchant's decision inbox: one place for receipts, approvals and rejections. */
export const ApplicationInbox: React.FC<ApplicationInboxProps> = ({
  isOpen,
  onClose,
  messages,
  unreadCount,
  onMarkAllRead,
  onOpenApplications,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="application-inbox-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-2xl dark:border-[#16436E] dark:bg-[#00223D]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#002541] px-4 py-3 text-white dark:border-[#144b77]">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-[#8df7c1]" aria-hidden="true" />
            <div>
              <h2 id="application-inbox-title" className="text-sm font-black">
                Inbox
              </h2>
              <p className="text-[11px] text-[#d0e4ff]">
                {unreadCount > 0 ? `${unreadCount} unread message${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[#8df7c1]/50 px-2.5 text-[11px] font-bold text-[#8df7c1] hover:bg-[#8df7c1]/10"
              >
                <MailOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inbox"
              className="rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-[#1E2E3D] dark:bg-[#0E1720]">
              <Inbox className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
              <p className="mt-2 text-xs font-bold text-slate-800 dark:text-white">No messages yet</p>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                Updates about your store, product and service applications will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {messages.map((message) => {
                const approved = message.status === 'approved';
                const rejected = message.status === 'rejected';
                return (
                  <li
                    key={message.id}
                    className={`rounded-xl border p-3 ${
                      message.unread
                        ? 'border-[#00875A]/45 bg-[#f1fbf7] dark:border-[#8df7c1]/40 dark:bg-[#06301f]'
                        : 'border-slate-200 bg-white dark:border-[#1E2E3D] dark:bg-[#0E1720]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                          approved
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : rejected
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                        }`}
                      >
                        {approved ? (
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        ) : rejected ? (
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ClipboardList className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {message.title}
                            {message.unread && (
                              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#00875A] align-middle dark:bg-[#8df7c1]" aria-label="Unread" />
                            )}
                          </p>
                          <time className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400" dateTime={message.date}>
                            {formatMessageDate(message.date)}
                          </time>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                          {message.body}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 p-3 dark:border-[#144b77]">
          <button
            type="button"
            onClick={onOpenApplications}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#00875A] text-xs font-bold text-white hover:bg-[#00704A]"
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            View my applications
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationInbox;
