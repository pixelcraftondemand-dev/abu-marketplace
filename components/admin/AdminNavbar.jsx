'use client'
import { useUser, useClerk } from "@clerk/nextjs"
import Link from "next/link"
import { LogOut } from "lucide-react"

const AdminNavbar = () => {
    const { user } = useUser()
    const { signOut } = useClerk()
    
    const handleSignOut = async () => {
        await signOut()
    }
    
    return (
        <div className="flex items-center justify-between px-12 py-3 border-b border-slate-200 transition-all">
            <Link href="/admin" className="relative text-4xl font-semibold text-slate-700">
                <span className="text-green-600">ABU</span> Marketplace
                <p className="absolute text-xs font-semibold -top-1 -right-13 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500">
                    Admin
                </p>
            </Link>
            <div className="flex items-center gap-3">
                <p>Hi, {user?.firstName || user?.fullName?.split(' ')[0]}</p>
                <button
                    onClick={handleSignOut}
                    className="p-2 hover:bg-slate-100 rounded-full transition"
                    title="Sign out"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </div>
    )
}

export default AdminNavbar