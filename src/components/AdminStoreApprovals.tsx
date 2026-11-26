import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { api, StoreSubmission, ReviewStatus } from '../services/api';

export interface AdminStoreApprovalsProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
  /** Fires after a decision lands, so the catalog can pick up a newly approved store. */
  onReviewed?: () => void;
}

type Filter = ReviewStatus | 'all';

const STATUS_STYLES: Record<ReviewStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending review',
    className: 'bg-amber-50 text-amber-800 border-amber-300',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-50 text-rose-800 border-rose-300',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

export const AdminStoreApprovals: React.FC<AdminStoreApprovalsProps> = ({ isOpen, onClose, onShowToast, onReviewed }) => {
  const [submissions, setSubmissions] = useState<StoreSubmission[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [notingId, setNotingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);
  const [preview, setPreview] = useState<{
    loading: boolean;
    error: string;
    data: { subject: string; html: string; text: string } | null;
  }>({ loading: false, error: '', data: null });

  const load = async (nextFilter: Filter = filter) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getStoreSubmissions(nextFilter === 'all' ? undefined : nextFilter);
      setSubmissions(data);
    } catch (err: any) {
      setError(err?.message || 'Could not load the review queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void load(filter);
      // A fresh queue starts with no decision panel left open from a previous visit.
      setApprovingId(null);
      setApproveNote('');
      setNotingId(null);
      setNoteDraft('');
      setRejectingId(null);
      setRejectReason('');
      setRejectError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filter]);

  // The approval panel shows the exact email that will be sent. It rebuilds (debounced)
  // while the note is edited, so what the admin reviews is what the merchant receives.
  useEffect(() => {
    if (!isOpen || !approvingId) {
      setPreview({ loading: false, error: '', data: null });
      return;
    }
    let cancelled = false;
    setPreview((current) => ({ ...current, loading: true, error: '' }));
    const timer = setTimeout(() => {
      void api
        .previewApprovalEmail(approvingId, approveNote.trim())
        .then((data) => {
          if (!cancelled) setPreview({ loading: false, error: '', data });
        })
        .catch((err: any) => {
          if (!cancelled) {
            setPreview({
              loading: false,
              error: err?.message || 'Could not build the email preview.',
              data: null,
            });
          }
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, approvingId, approveNote]);

  const counts = useMemo(() => {
    return {
      shown: submissions.length,
      pending: submissions.filter((s) => s.status === 'pending').length,
    };
  }, [submissions]);

  // Esc dismisses the queue, and locking the page keeps the catalog from
  // scrolling behind the panel on touch devices.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApprove = async (submission: StoreSubmission) => {
    setBusyId(submission.id);
    setError('');
    try {
      const note = approveNote.trim();
      const { emailStatus } = await api.approveStoreSubmission(submission.id, note || undefined);
      setNotice({
        kind: emailStatus === 'failed' ? 'warn' : 'ok',
        text:
          emailStatus === 'failed'
            ? `"${submission.name}" is now live, but the approval email could not be sent.`
            : `"${submission.name}" is now live and the merchant has been emailed.`,
      });
      onShowToast?.(`Store approved: ${submission.name}`);
      setApprovingId(null);
      setApproveNote('');
      await load();
      onReviewed?.();
    } catch (err: any) {
      setError(err?.message || 'Could not approve this application');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveNote = async (submission: StoreSubmission) => {
    setBusyId(submission.id);
    setError('');
    setNotice(null);
    try {
      const updated = await api.updateStoreSubmissionNote(submission.id, noteDraft.trim());
      setNotice({
        kind: 'ok',
        text: updated.review_note
          ? `Approval note updated for "${submission.name}". The merchant sees it on their approved store.`
          : `Approval note removed from "${submission.name}".`,
      });
      onShowToast?.(updated.review_note ? 'Approval note updated' : 'Approval note removed');
      setNotingId(null);
      setNoteDraft('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not save the approval note');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (submission: StoreSubmission) => {
    if (!rejectReason.trim()) {
      setRejectError('Give the merchant a reason so they know what to fix');
      return;
    }
    setBusyId(submission.id);
    setError('');
    try {
      const { emailStatus } = await api.rejectStoreSubmission(submission.id, rejectReason.trim());
      setNotice({
        kind: emailStatus === 'failed' ? 'warn' : 'ok',
        text:
          emailStatus === 'failed'
            ? `"${submission.name}" was rejected, but the rejection email could not be sent.`
            : `"${submission.name}" was rejected and the merchant has been emailed the reason.`,
      });
      onShowToast?.(`Store rejected: ${submission.name}`);
      setRejectingId(null);
      setRejectReason('');
      setApprovingId(null);
      await load();
      onReviewed?.();
    } catch (err: any) {
      setError(err?.message || 'Could not reject this application');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Store application approvals"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0E1720] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1E2E3D] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-[#1E2E3D] bg-[#002541] text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-[#8df7c1] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight truncate">Store approvals</h2>
              <p className="text-[11px] text-slate-300 truncate">
                {counts.shown} application{counts.shown === 1 ? '' : 's'} shown · {counts.pending} pending
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-[#1E2E3D] overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`h-7 px-2.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filter === value
                  ? 'bg-[#0B3B60] text-white'
                  : 'bg-slate-100 dark:bg-[#15222E] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1E2E3D]'
              }`}
            >
              {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {notice && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 text-xs font-semibold ${
                notice.kind === 'ok'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="flex-1">{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 flex items-start gap-2 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {isLoading && submissions.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">Loading applications...</span>
            </div>
          )}

          {!isLoading && submissions.length === 0 && !error && (
            <div className="py-16 flex flex-col items-center gap-2 text-slate-500">
              <Store className="w-8 h-8 text-slate-300" />
              <span className="text-xs font-semibold">
                No {filter === 'all' ? '' : filter} applications right now.
              </span>
            </div>
          )}

          {submissions.map((submission) => {
            const style = STATUS_STYLES[submission.status];
            const isBusy = busyId === submission.id;
            return (
              <div
                key={submission.id}
                className="rounded-xl border border-slate-200 dark:border-[#1E2E3D] bg-white dark:bg-[#111D27] p-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {submission.name}
                      </h3>
                      <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:border-[#1E2E3D] dark:bg-[#15222E] dark:text-slate-200">
                        {submission.kind === 'product' ? 'Single item' : submission.kind === 'service' ? 'Artisan' : 'Store'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${style.className}`}>
                        {style.icon}
                        {style.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {submission.tagline || 'No tagline provided'}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">
                    {new Date(submission.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{submission.owner_email}</span>
                  </span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{submission.phone}</span>
                  </span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">
                      {[submission.location_hub, submission.province].filter(Boolean).join(' · ') || 'Location not given'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Store className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">/{submission.slug}</span>
                  </span>
                </div>

                {submission.kind === 'product' && submission.payload && (
                  <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                    {'category' in submission.payload ? String(submission.payload.category) : ''}
                    {' · SLE '}
                    {'priceSLE' in submission.payload ? Number(submission.payload.priceSLE).toLocaleString() : ''}
                    {' · '}
                    {'stockCount' in submission.payload ? `${submission.payload.stockCount} in stock` : ''}
                  </p>
                )}
                {submission.kind === 'service' && submission.payload && (
                  <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                    {'tradeCategory' in submission.payload ? String(submission.payload.tradeCategory) : ''}
                    {' · '}
                    {'experienceYears' in submission.payload ? `${submission.payload.experienceYears} yrs experience` : ''}
                    {' · SLE '}
                    {'calloutFeeSLE' in submission.payload ? Number(submission.payload.calloutFeeSLE).toLocaleString() : ''}
                    {' callout'}
                  </p>
                )}

                {submission.description && (
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">
                    {submission.description}
                  </p>
                )}

                {submission.review_note && submission.status !== 'pending' && (
                  <p className="mt-2 text-[11px] text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#15222E] rounded p-2">
                    <strong>Reviewer note:</strong> {submission.review_note}
                  </p>
                )}

                {/* Approved stores keep their note editable; the decision itself does not move. */}
                {submission.status === 'approved' && submission.kind === 'store' && (
                  <div className="mt-2">
                    {notingId === submission.id ? (
                      <div className="space-y-2 rounded-lg border border-slate-200 dark:border-[#1E2E3D] bg-slate-50/60 dark:bg-[#15222E] p-2.5">
                        <label
                          htmlFor={`store-note-${submission.id}`}
                          className="block text-[11px] font-bold text-slate-700 dark:text-slate-200"
                        >
                          Approval note{' '}
                          <span className="font-normal text-slate-500 dark:text-slate-400">
                            (shown to the merchant; the approval stays as it is)
                          </span>
                        </label>
                        <textarea
                          id={`store-note-${submission.id}`}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          rows={2}
                          maxLength={1000}
                          placeholder="Leave empty to remove the note."
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-[#1E4366] bg-white dark:bg-[#041424] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00875A]"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleSaveNote(submission)}
                            className="h-8 px-3 rounded-lg bg-[#00875A] hover:bg-[#00704A] disabled:opacity-50 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Save note
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setNotingId(null);
                              setNoteDraft('');
                            }}
                            className="h-8 px-3 rounded-lg border border-slate-300 dark:border-[#1E2E3D] text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          {submission.review_note && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setNoteDraft('')}
                              className="h-8 px-2 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setNotingId(submission.id);
                          setNoteDraft(submission.review_note || '');
                          setError('');
                        }}
                        className="h-8 px-3 rounded-lg border border-slate-300 dark:border-[#1E2E3D] text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#15222E] cursor-pointer disabled:opacity-50"
                      >
                        {submission.review_note ? 'Edit approval note' : 'Add approval note'}
                      </button>
                    )}
                  </div>
                )}

                {submission.status === 'pending' && (
                  <div className="mt-3">
                    {approvingId === submission.id ? (
                      <div className="space-y-2">
                        <label
                          htmlFor={`approve-note-${submission.id}`}
                          className="block text-[11px] font-bold text-slate-700 dark:text-slate-200"
                        >
                          Approval note{' '}
                          <span className="font-normal text-slate-500 dark:text-slate-400">
                            (optional — the merchant sees it on their approved store)
                          </span>
                        </label>
                        <textarea
                          id={`approve-note-${submission.id}`}
                          value={approveNote}
                          onChange={(e) => setApproveNote(e.target.value)}
                          rows={2}
                          maxLength={1000}
                          placeholder="e.g. Welcome aboard — your logo and payout number were verified."
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-[#1E4366] bg-white dark:bg-[#041424] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00875A]"
                        />

                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-[#1E2E3D]">
                          <div className="flex items-center justify-between gap-2 bg-slate-50 px-2.5 py-1.5 dark:bg-[#15222E]">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                              Email preview
                            </span>
                            <span className="min-w-0 truncate text-[10px] text-slate-500 dark:text-slate-400">
                              To: {submission.owner_email}
                            </span>
                          </div>
                          {preview.loading && !preview.data && (
                            <div className="flex items-center gap-2 p-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              Building preview…
                            </div>
                          )}
                          {preview.error && (
                            <p className="p-3 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                              {preview.error} You can still approve; the merchant will receive the standard email.
                            </p>
                          )}
                          {preview.data && (
                            <>
                              <p className="border-t border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:border-[#1E2E3D] dark:bg-[#041424] dark:text-slate-100">
                                {preview.data.subject}
                              </p>
                              <iframe
                                title={`Approval email preview for ${submission.name}`}
                                srcDoc={preview.data.html}
                                sandbox=""
                                referrerPolicy="no-referrer"
                                className="h-60 w-full border-t border-slate-200 bg-white dark:border-[#1E2E3D]"
                              />
                              <details className="border-t border-slate-200 px-2.5 py-1.5 dark:border-[#1E2E3D]">
                                <summary className="cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                  Plain-text version
                                </summary>
                                <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words font-sans text-[10px] leading-relaxed text-slate-700 dark:text-slate-300">
                                  {preview.data.text}
                                </pre>
                              </details>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleApprove(submission)}
                            className="h-8 px-3 rounded-lg bg-[#00875A] hover:bg-[#00704A] disabled:opacity-50 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve & publish
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setApprovingId(null);
                              setApproveNote('');
                            }}
                            className="h-8 px-3 rounded-lg border border-slate-300 dark:border-[#1E2E3D] text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : rejectingId === submission.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => {
                            setRejectReason(e.target.value);
                            setRejectError('');
                          }}
                          rows={2}
                          placeholder="Reason sent to the merchant (what to fix before reapplying)"
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-[#1E4366] bg-white dark:bg-[#041424] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                        />
                        {rejectError && <p className="text-[11px] font-semibold text-rose-600">{rejectError}</p>}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleReject(submission)}
                            className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Confirm rejection
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason('');
                              setRejectError('');
                            }}
                            className="h-8 px-3 rounded-lg border border-slate-300 dark:border-[#1E2E3D] text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setApprovingId(submission.id);
                            setApproveNote('');
                            setRejectingId(null);
                          }}
                          className="h-8 px-3 rounded-lg bg-[#00875A] hover:bg-[#00704A] disabled:opacity-50 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve & publish
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setRejectingId(submission.id);
                            setRejectReason('');
                            setRejectError('');
                            setApprovingId(null);
                          }}
                          className="h-8 px-3 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
