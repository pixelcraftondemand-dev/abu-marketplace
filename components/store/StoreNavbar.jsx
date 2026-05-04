'use client'
import { useUser, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { BellIcon, StoreIcon } from "lucide-react"

const StoreNavbar = () => {
    const { user } = useUser()

    return (
        <div className="flex items-center justify-between px-6 sm:px-10 py-3 border-b border-slate-100 bg-white shadow-sm transition-all">
            <Link href="/store" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center shadow group-hover:bg-green-700 transition">
                    <StoreIcon size={18} className="text-white" />
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-slate-800 font-semibold text-sm tracking-tight">ABU Marketplace</span>
                    <span className="text-green-600 text-xs font-medium">Seller Dashboard</span>
                </div>
            </Link>

            <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                    <BellIcon size={18} />
                </button>
                <div className="h-6 w-px bg-slate-200" />
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end leading-tight">
                        <p className="text-sm font-medium text-slate-700">{user?.fullName}</p>
                        <p className="text-xs text-slate-400">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    <UserButton />
                </div>
            </div>
        </div>
    )
}

export default StoreNavbar