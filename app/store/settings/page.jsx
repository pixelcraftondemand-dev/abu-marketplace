'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import { MessageCircle, Save, Store, Phone } from 'lucide-react'

export default function StoreSettings() {
    const { getToken } = useAuth()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [storeInfo, setStoreInfo] = useState(null)
    const [whatsappNumber, setWhatsappNumber] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                const token = await getToken()
                const { data } = await axios.get('/api/store/is-seller', {
                    headers: { Authorization: `Bearer ${token}` },
                })
                setStoreInfo(data.storeInfo || null)
                setWhatsappNumber(data.storeInfo?.whatsappNumber || '')
            } catch (err) {
                toast.error(err?.response?.data?.error || err.message)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const onSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const token = await getToken()
            const { data } = await axios.post(
                '/api/store/update',
                { whatsappNumber: whatsappNumber.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setWhatsappNumber(data.whatsappNumber || '')
            toast.success('Store settings updated')
        } catch (err) {
            toast.error(err?.response?.data?.error || err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <Loading />

    return (
        <div className="pb-20">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">
                    Store <span className="text-green-600">Settings</span>
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                    Manage how buyers can reach your store.
                </p>
            </div>

            <form
                onSubmit={onSubmit}
                className="max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                    <Store size={18} className="text-slate-400" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                            {storeInfo?.name || 'Your store'}
                        </p>
                        <p className="text-xs text-slate-400">
                            {storeInfo?.username ? `@${storeInfo.username}` : 'Approved seller'}
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Phone size={15} className="text-slate-400" />
                        Store contact
                    </div>
                    <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        {storeInfo?.contact || 'Not set'}
                    </p>
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="whatsappNumber"
                        className="flex items-center gap-2 text-sm font-medium text-slate-700"
                    >
                        <MessageCircle size={15} className="text-green-600" />
                        WhatsApp number
                    </label>
                    <input
                        id="whatsappNumber"
                        name="whatsappNumber"
                        type="tel"
                        inputMode="tel"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="e.g. 076 123 456"
                        maxLength={20}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-500/10"
                    />
                    <p className="text-xs text-slate-400">
                        Buyers can message you about your products. Leave blank to hide the
                        WhatsApp button from your storefront.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Save size={15} />
                    {saving ? 'Saving…' : 'Save changes'}
                </button>
            </form>
        </div>
    )
}
