'use client'
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
    HomeIcon,
    SquarePlusIcon,
    SquarePenIcon,
    LayoutListIcon,
    TrendingUpIcon
} from "lucide-react"

const links = [
    { label: 'Dashboard',       href: '/store',                icon: HomeIcon       },
    { label: 'Add Product',     href: '/store/add-product',    icon: SquarePlusIcon },
    { label: 'Manage Products', href: '/store/manage-product', icon: SquarePenIcon  },
    { label: 'Orders',          href: '/store/orders',         icon: LayoutListIcon },
]

const StoreSidebar = ({ storeInfo }) => {
    const pathname = usePathname()

    return (
        <aside className="w-14 sm:w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 py-5">

            <div className="flex flex-col items-center gap-2 px-3 pb-5 border-b border-slate-100 max-sm:hidden">
                {storeInfo?.logo ? (
                    <Image
                        src={storeInfo.logo}
                        alt={storeInfo.name}
                        width={52}
                        height={52}
                        className="w-13 h-13 rounded-xl object-cover ring-2 ring-green-100"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <TrendingUpIcon size={22} className="text-green-600" />
                    </div>
                )}
                <p className="text-sm font-semibold text-slate-800 text-center leading-tight">
                    {storeInfo?.name || 'My Store'}
                </p>
                <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                    Active
                </span>
            </div>

            <nav className="flex flex-col gap-1 px-2 pt-4">
                {links.map(({ label, href, icon: Icon }) => {
                    const active = pathname === href
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                                ${active
                                    ? 'bg-green-50 text-green-700'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                        >
                            <Icon size={17} className={active ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600'} />
                            <span className="max-sm:hidden">{label}</span>
                            {active && (
                                <span className="absolute right-0 inset-y-1.5 w-1 bg-green-500 rounded-l-full" />
                            )}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}

export default StoreSidebar