'use client'
import { useUser, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { StoreIcon } from "lucide-react"

const StoreNavbar = ({ storeInfo }) => {
    const { user } = useUser()

    return (
        <header className="flex items-center justify-between px-6 sm:px-10 py-3 bg-white border-b border-slate-200 shadow-sm z-10">
            <Link href="/store" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-green-700 transition">
                    <StoreIcon size={17} className="text-white" />
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-slate-800 font-bold text-sm tracking-tight">ABU Marketplace</span>
                    <span className="text-green-600 text-xs font-medium">Seller Portal</span>
                </div>
            </Link>

            <div className="flex items-center gap-3">
                {storeInfo?.name && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 px-3 py-1 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                        {storeInfo.name}
                    </span>
                )}
                <div className="h-5 w-px bg-slate-200" />
                <div className="flex items-center gap-2.5">
                    <div className="hidden sm:flex flex-col items-end leading-tight">
                        <p className="text-xs font-semibold text-slate-700">{user?.fullName}</p>
                        <p className="text-xs text-slate-400">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    <UserButton />
                </div>
            </div>
        </header>
    )
}

export default StoreNavbar