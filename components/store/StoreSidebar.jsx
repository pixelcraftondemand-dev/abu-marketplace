'use client'
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboardIcon,
    PackagePlusIcon,
    PackageIcon,
    ShoppingCartIcon,
    SettingsIcon,
} from "lucide-react"

const navItems = [
    { label: "Dashboard",       href: "/store/dashboard",      icon: LayoutDashboardIcon },
    { label: "Add Product",     href: "/store/add-product",    icon: PackagePlusIcon     },
    { label: "Products",        href: "/store/manage-product", icon: PackageIcon         },
    { label: "Orders",          href: "/store/orders",         icon: ShoppingCartIcon    },
    { label: "Settings",        href: "/store/settings",       icon: SettingsIcon        },
]

const StoreSidebar = ({ storeInfo }) => {
    const pathname = usePathname()

    const checkActive = (href) => {
        if (href === "/store") return pathname === "/store"
        return pathname.startsWith(href)
    }

    const getLinkClass = (href) => {
        const base = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors "
        if (checkActive(href)) return base + "bg-green-50 text-green-700"
        return base + "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
    }

    const getInitial = (name) => {
        if (!name) return "S"
        return name.charAt(0).toUpperCase()
    }

    return (
        <>
            <nav aria-label="Seller navigation" className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
                {navItems.map((item) => {
                    const NavIcon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={checkActive(item.href) ? "page" : undefined}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                checkActive(item.href)
                                    ? "bg-green-50 text-green-700"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            }`}
                        >
                            <NavIcon size={15} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>
            <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-slate-100 bg-white px-3 pb-4 pt-6 md:flex">
            {storeInfo && (
                <div className="flex flex-col items-center gap-2 mb-6 px-2">
                    {storeInfo.logo ? (
                        <img
                            src={storeInfo.logo}
                            alt={storeInfo.name}
                            className="w-12 h-12 rounded-full object-cover border border-slate-200"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                            {getInitial(storeInfo.name)}
                        </div>
                    )}
                    <p className="text-sm font-semibold text-slate-700 truncate w-full text-center">
                        {storeInfo.name}
                    </p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Approved
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
        </>
    )
}

export default StoreSidebar
