'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { RefreshCw } from "lucide-react"
import {
    STORE_REJECTION_REASONS,
    STORE_STATUS,
    MIN_REJECTION_REASON_LENGTH,
    MAX_REJECTION_REASON_LENGTH,
} from "@/lib/storeStatus"

export default function AdminApprove() {

    const { user } = useUser()
    const { getToken } = useAuth()
    const [stores, setStores] = useState([])
    const [counts, setCounts] = useState({ pending: 0, rejected: 0 })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [loadError, setLoadError] = useState("")
    const [busyId, setBusyId] = useState(null)
    // storeId -> rejection reason being typed
    const [rejectingId, setRejectingId] = useState(null)
    const [reason, setReason] = useState("")

    const fetchStores = async () => {
        setLoadError("")
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/approve-store', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setStores(data.stores || [])
            setCounts(data.counts || { pending: 0, rejected: 0 })
        } catch (error) {
            const message = error?.response?.data?.error || error.message || "Could not load store applications."
            setLoadError(message)
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    const refreshStores = async () => {
        setRefreshing(true)
        try {
            await fetchStores()
        } finally {
            setRefreshing(false)
        }
    }

    // Throws on failure so toast.promise can report it — previously this
    // swallowed the error and toast.promise always claimed success.
    const reviewStore = async ({ storeId, decision, reason: rejectionReason }) => {
        setBusyId(storeId)
        try {
            const token = await getToken()
            const { data } = await axios.post(
                '/api/admin/approve-store',
                { storeId, decision, reason: rejectionReason },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            await fetchStores()
            return data
        } finally {
            setBusyId(null)
        }
    }

    const handleApprove = async (storeId) => {
        try {
            const data = await toast.promise(reviewStore({ storeId, decision: 'approve' }), {
                loading: 'Approving…',
                success: (res) => res?.message || 'Store approved',
                error: (err) => err?.response?.data?.error || 'Could not approve this store.',
            })
            if (data?.notified === false) {
                toast.error('Approved, but the seller could not be emailed — tell them directly.')
            }
        } catch {
            // toast.promise already surfaced the reason
        }
    }

    const handleReject = async (storeId) => {
        if (reason.trim().length < MIN_REJECTION_REASON_LENGTH) {
            toast.error(`Tell the seller why, in at least ${MIN_REJECTION_REASON_LENGTH} characters.`)
            return
        }
        try {
            const data = await toast.promise(
                reviewStore({ storeId, decision: 'reject', reason }),
                {
                    loading: 'Rejecting…',
                    success: (res) => res?.message || 'Store rejected',
                    error: (err) => err?.response?.data?.error || 'Could not reject this store.',
                }
            )
            setRejectingId(null)
            setReason('')
            if (data?.notified === false) {
                toast.error('Rejected, but the seller could not be emailed — tell them directly.')
            }
        } catch {
            // toast.promise already surfaced the reason
        }
    }

    useEffect(() => {
        if (user) {
            fetchStores()
        }
    }, [user])

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl">
                        Approve <span className="text-slate-800 font-medium">Stores</span>
                    </h1>
                    <p className="mt-2 text-sm">
                        {counts.pending} awaiting review
                        {counts.rejected > 0 && <> · {counts.rejected} rejected, waiting on the seller</>}
                    </p>
                    <p className="mt-1 max-w-2xl text-xs text-slate-400">
                        Approving makes the store live immediately. Rejecting requires a reason — the
                        seller is emailed it and can fix the application and resubmit from the same page.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={refreshStores}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                >
                    <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {loadError ? (
                <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span>{loadError}</span>
                    <button type="button" onClick={refreshStores} disabled={refreshing} className="font-semibold underline underline-offset-2 disabled:opacity-60">
                        Try again
                    </button>
                </div>
            ) : stores.length ? (
                <div className="flex flex-col gap-4 mt-4">
                    {stores.map((store) => {
                        const isBusy = busyId === store.id
                        const isRejecting = rejectingId === store.id
                        const wasRejected = store.status === STORE_STATUS.REJECTED

                        return (
                            <div
                                key={store.id}
                                className="bg-white border rounded-lg shadow-sm p-6 flex flex-col gap-4 max-w-4xl"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            wasRejected
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {wasRejected ? 'Rejected — seller may resubmit' : 'Pending review'}
                                    </span>
                                    {store.reviewedAt && (
                                        <span className="text-xs text-slate-400">
                                            Last reviewed {new Date(store.reviewedAt).toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                <div className="flex max-md:flex-col gap-4 md:items-end">
                                    <StoreInfo store={store} />

                                    {!isRejecting && (
                                        <div className="flex gap-3 pt-2 flex-wrap">
                                            <button
                                                onClick={() => handleApprove(store.id)}
                                                disabled={isBusy}
                                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isBusy ? 'Working…' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setRejectingId(store.id)
                                                    setReason(store.rejectionReason || '')
                                                }}
                                                disabled={isBusy}
                                                className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {wasRejected && !isRejecting && store.rejectionReason && (
                                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                        <span className="font-semibold">Reason sent to seller: </span>
                                        {store.rejectionReason}
                                    </p>
                                )}

                                {isRejecting && (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <label
                                            htmlFor={`reason-${store.id}`}
                                            className="block text-sm font-semibold text-slate-700"
                                        >
                                            Why is this application being rejected?
                                        </label>
                                        <p className="mt-1 text-xs text-slate-500">
                                            The seller sees this and can resubmit. Be specific enough
                                            that they know what to change.
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {STORE_REJECTION_REASONS.map((preset) => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => setReason(preset)}
                                                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                                        reason === preset
                                                            ? 'border-slate-800 bg-slate-800 text-white'
                                                            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                                                    }`}
                                                >
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            id={`reason-${store.id}`}
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            rows={3}
                                            maxLength={MAX_REJECTION_REASON_LENGTH}
                                            placeholder="Or write a specific reason…"
                                            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
                                        />
                                        <div className="mt-3 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRejectingId(null)
                                                    setReason('')
                                                }}
                                                disabled={isBusy}
                                                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReject(store.id)}
                                                disabled={isBusy || reason.trim().length < MIN_REJECTION_REASON_LENGTH}
                                                className="px-4 py-2 bg-slate-700 text-white rounded text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isBusy ? 'Sending…' : 'Reject and notify seller'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="mt-5 flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <h2 className="text-xl font-semibold text-slate-700">You’re all caught up</h2>
                    <p className="mt-2 max-w-sm px-4 text-sm text-slate-400">New store applications will appear here when sellers submit their forms.</p>
                </div>
            )}
        </div>
    )
}
