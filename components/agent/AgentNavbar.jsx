'use client'
import { useUser, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { Banknote } from "lucide-react"

const AgentNavbar = ({ agentInfo }) => {
    const { user } = useUser()

    return (
        <header className="flex items-center justify-between px-6 sm:px-10 py-3 bg-white border-b border-slate-200 shadow-sm z-10">
            <Link href="/agent" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-amber-600 transition">
                    <Banknote size={17} className="text-white" />
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-slate-800 font-bold text-sm tracking-tight">AMBER PAY</span>
                    <span className="text-amber-600 text-xs font-medium">Agent Portal</span>
                </div>
            </Link>

            <div className="flex items-center gap-3">
                {agentInfo?.businessName && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                        {agentInfo.businessName}
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

export default AgentNavbar
