import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  clearStoreLogoOutcome,
  failureHint,
  readStoreLogoOutcome,
  type StoreLogoOutcome,
} from '../lib/uploadDiagnostics';

/**
 * Admin-only view of the store logo upload path: what the deployed API reports it is
 * configured to do, and the last attempt this browser made. Readiness comes from
 * /api/health (no secrets), so a missing Clerk or ImageKit key is visible without
 * reaching for the Vercel logs.
 */

type Health = {
  status?: string;
  clerkVerified?: boolean;
  clerkError?: string | null;
  supabase?: boolean;
  uploads?: { storeLogo?: string };
};

type Tone = 'ok' | 'warn' | 'bad';

const TONE_CLASSES: Record<Tone, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  bad: 'border-rose-200 bg-rose-50 text-rose-900',
};

const TONE_ICONS: Record<Tone, React.FC<{ className?: string }>> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
};

const formatBytes = (bytes: number | null): string => {
  if (bytes === null) return 'not sent';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const UploadDiagnosticsPanel: React.FC = () => {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthStatus, setHealthStatus] = useState<number | null>(null);
  const [healthError, setHealthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<StoreLogoOutcome | null>(() => readStoreLogoOutcome());

  const loadHealth = useCallback(async () => {
    setIsLoading(true);
    setHealthError('');
    try {
      const res = await fetch('/api/health', { headers: { Accept: 'application/json' } });
      setHealthStatus(res.status);
      if (!res.ok) {
        setHealth(null);
        setHealthError(`The health endpoint answered ${res.status}.`);
        return;
      }
      setHealth((await res.json()) as Health);
    } catch {
      setHealth(null);
      setHealthStatus(null);
      setHealthError('The health endpoint could not be reached from this browser.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const clerkVerified = health?.clerkVerified;
  const clerkTone: Tone = clerkVerified ? 'ok' : 'bad';
  const clerkNote = clerkVerified
    ? 'The API verified its Clerk secret with a real request.'
    : `The API could not verify its Clerk secret${health?.clerkError ? `: ${health.clerkError}` : '.'}`;
  const logoStore = health?.uploads?.storeLogo;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#0B3B60] dark:text-[#38BDF8]">
            <Activity className="h-4 w-4" aria-hidden="true" />
            Store Logo Upload Diagnostics
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            Readiness comes from <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-[#0F1B26]">/api/health</code> on{' '}
            {typeof window === 'undefined' ? 'this deployment' : window.location.origin}. The last attempt is recorded in this
            browser only, never on the server.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadHealth()}
          disabled={isLoading}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded border border-[#DCE1E5] bg-white px-2.5 text-[11px] font-bold text-[#0B3B60] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#1E2E3D] dark:bg-[#111D27] dark:text-[#38BDF8]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isLoading ? 'Checking…' : 'Re-check readiness'}
        </button>
      </div>

      {healthError && (
        <div className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-900">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{healthError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className={`rounded border p-3 ${TONE_CLASSES[clerkTone]}`}>
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold">
            {React.createElement(TONE_ICONS[clerkTone], { className: 'h-3.5 w-3.5' })}
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Clerk session keys
          </div>
          <p className="mt-1 text-[11px] font-bold">
            {clerkVerified === undefined ? 'not reported' : clerkVerified ? 'verified' : 'failed'}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed">{clerkNote}</p>
        </div>

        <div className={`rounded border p-3 ${TONE_CLASSES[logoStore === 'configured' ? 'ok' : 'bad']}`}>
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold">
            {React.createElement(TONE_ICONS[logoStore === 'configured' ? 'ok' : 'bad'], { className: 'h-3.5 w-3.5' })}
            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Image storage (ImageKit)
          </div>
          <p className="mt-1 text-[11px] font-bold">{logoStore ?? 'not reported'}</p>
          <p className="mt-1 text-[10px] leading-relaxed">
            {logoStore === 'configured'
              ? 'The logo route has the private key and URL endpoint it needs to store a file.'
              : 'The logo route answers 503 until IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT are set.'}
          </p>
        </div>

        <div className={`rounded border p-3 ${TONE_CLASSES[health?.supabase ? 'ok' : 'bad']}`}>
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold">
            {React.createElement(TONE_ICONS[health?.supabase ? 'ok' : 'bad'], { className: 'h-3.5 w-3.5' })}
            <Server className="h-3.5 w-3.5" aria-hidden="true" />
            Product database
          </div>
          <p className="mt-1 text-[11px] font-bold">
            {health?.supabase === undefined ? 'not reported' : health.supabase ? 'configured' : 'missing'}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed">
            Health endpoint answered {healthStatus ?? 'nothing'}.
          </p>
        </div>
      </div>

      <div className="rounded border border-[#DCE1E5] dark:border-[#1E2E3D]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE1E5] px-3 py-2 dark:border-[#1E2E3D]">
          <h4 className="text-xs font-extrabold text-[#1A242D] dark:text-white">Last logo upload in this browser</h4>
          {lastOutcome && (
            <button
              type="button"
              onClick={() => {
                clearStoreLogoOutcome();
                setLastOutcome(null);
              }}
              className="inline-flex h-7 items-center gap-1.5 rounded border border-[#DCE1E5] px-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-[#1E2E3D] dark:text-slate-300"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        {!lastOutcome ? (
          <p className="px-3 py-4 text-[11px] text-slate-600 dark:text-slate-400">
            No upload attempt has been recorded on this device yet. Upload a logo from the Merchant Hub here and this card
            fills in with the exact outcome.
          </p>
        ) : (
          <div className="space-y-2 px-3 py-3">
            <div className={`flex items-start gap-2 rounded border p-2.5 text-[11px] ${TONE_CLASSES[lastOutcome.outcome === 'uploaded' ? 'ok' : 'bad']}`}>
              {React.createElement(TONE_ICONS[lastOutcome.outcome === 'uploaded' ? 'ok' : 'bad'], {
                className: 'mt-0.5 h-4 w-4 shrink-0',
              })}
              <div className="min-w-0">
                <p className="font-extrabold">
                  {lastOutcome.outcome === 'uploaded'
                    ? 'The image reached storage.'
                    : lastOutcome.kind === 'file'
                      ? 'Refused in the browser before any request.'
                      : 'The upload request failed.'}
                </p>
                <p className="mt-0.5 break-words leading-relaxed">{lastOutcome.message}</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] sm:grid-cols-4">
              <div>
                <dt className="font-bold text-slate-500 dark:text-slate-400">When</dt>
                <dd className="text-[#1A242D] dark:text-white">
                  {new Date(lastOutcome.at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500 dark:text-slate-400">HTTP status</dt>
                <dd className="text-[#1A242D] dark:text-white">{lastOutcome.status ?? 'none (no response)'}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500 dark:text-slate-400">Chosen file</dt>
                <dd className="truncate text-[#1A242D] dark:text-white" title={lastOutcome.fileName}>
                  {lastOutcome.fileName} · {lastOutcome.fileType.replace('image/', '')} · {formatBytes(lastOutcome.sourceBytes)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500 dark:text-slate-400">Sent after resizing</dt>
                <dd className="text-[#1A242D] dark:text-white">{formatBytes(lastOutcome.sentBytes)}</dd>
              </div>
              {lastOutcome.authCode && (
                <div>
                  <dt className="font-bold text-slate-500 dark:text-slate-400">Session reason</dt>
                  <dd className="font-mono text-[#1A242D] dark:text-white">{lastOutcome.authCode}</dd>
                </div>
              )}
            </dl>

            {lastOutcome.outcome === 'failed' && (
              <p className="rounded bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-700 dark:bg-[#0F1B26] dark:text-slate-300">
                <span className="font-extrabold">What to check: </span>
                {failureHint(lastOutcome.status, lastOutcome.authCode)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
