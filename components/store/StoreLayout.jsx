'use client'
import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import StoreNavbar from "./StoreNavbar"
import StoreSidebar from "./StoreSidebar"
import Loading from "@/components/Loading"

const StoreLayout = ({ children }) => {
    const { getToken } = useAuth()
    const [isSeller, setIsSeller] = useState(false)
    const [storeInfo, setStoreInfo] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const check = async () => {
            try {
                const token = await getToken()
                const { data } = await axios.get('/api/store/is-seller', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (data.isSeller) {
                    setIsSeller(true)
                    setStoreInfo(data.storeInfo)
                }
            } catch (err) {
                console.error('[StoreLayout]', err?.response?.data || err.message)
            } finally {
                setLoading(false)
            }
        }
        check()
    }, [])

    if (loading) return <Loading />

    if (!isSeller) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-2">
                <ArrowRightIcon size={24} className="text-red-400 rotate-180" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-600">Store not accessible</h1>
            <p className="text-slate-400 text-sm max-w-sm">Your store may still be pending approval, or you have not created one yet.</p>
            <Link href="/" className="bg-slate-800 text-white flex items-center gap-2 mt-2 py-2.5 px-6 text-sm rounded-full hover:bg-slate-900 transition">
                Go to Home <ArrowRightIcon size={15} />
            </Link>
            <Link href="/create-store" className="text-green-600 text-sm underline underline-offset-2">
                Create a store
            </Link>
        </div>
    )

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            <StoreNavbar storeInfo={storeInfo} />
            <div className="flex flex-1 overflow-hidden">
                <StoreSidebar storeInfo={storeInfo} />
                <main className="flex-1 overflow-y-auto p-6 lg:p-10">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default StoreLayout