'use client'
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboardIcon,
    ClipboardListIcon,
    BanknoteIcon,
    HistoryIcon,
    SettingsIcon,
} from "lucide-react"

const navItems = [
    { label: "Dashboard",    href: "/agent",                icon: LayoutDashboardIcon },
    { label: "Requests",     href: "/agent/requests",       icon: ClipboardListIcon  },
    { label: "Cash-Outs",    href: "/agent/cashouts",       icon: BanknoteIcon       },
    { label: "History",      href: "/agent/history",        icon: HistoryIcon        },
    { label: "Settings",     href: "/agent/settings",       icon: SettingsIcon       },
]

const AgentSidebar = ({ agentInfo }) => {
    const pathname = usePathname()

    const checkActive = (href) => {
        if (href === "/agent") return pathname === "/agent"
        return pathname.startsWith(href)
    }

    const getLinkClass = (href) => {
        const base = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors "
        if (checkActive(href)) return base + "bg-amber-50 text-amber-700"
        return base + "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
    }

    const getInitial = (name) => {
        if (!name) return "A"
        return name.charAt(0).toUpperCase()
    }

    return (
        <aside className="hidden md:flex flex-col w-56 shrink-0 h-full border-r border-slate-100 bg-white pt-6 pb-4 px-3">
            {agentInfo && (
                <div className="flex flex-col items-center gap-2 mb-6 px-2">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg">
                        {getInitial(agentInfo.businessName)}
                    </div>
                    <p className="text-sm font-semibold text-slate-700 truncate w-full text-center">
                        {agentInfo.businessName}
                    </p>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        {agentInfo.status === "active" ? "Active" : agentInfo.status}
                    </span>
                </div>
            )}
            <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                    const NavIcon = item.icon
                    return (
                        <Link key={item.href} href={item.href} className={getLinkClass(item.href)}>
                            <NavIcon size={17} className="shrink-0" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}

export default AgentSidebar
