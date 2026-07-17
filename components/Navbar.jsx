'use client'
import { PackageIcon, Search, ShoppingCart, Heart, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useUser, useClerk } from "@clerk/nextjs";

const Navbar = () => {

    const { user } = useUser()
    const { signOut } = useClerk()
    const router = useRouter();

    const [search, setSearch] = useState('')
    const cartCount = useSelector(state => state.cart.total)
    const wishlistCount = useSelector(state => state.wishlist.items.length)

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${search}`)
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    return (
        <nav className="relative bg-white">
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4  transition-all">

                    <Link href="/" className="relative text-4xl font-semibold text-slate-700">
                        <span className="text-green-600">ABU</span> MARKETPLACE<span className="text-green-600 text-5xl leading-0">.</span>
                       
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
                        <Link href="/">Home</Link>
                        <Link href="/shop">Shop</Link>
                        <Link href="/">About</Link>
                        <Link href="/">Contact</Link>

                        <form onSubmit={handleSearch} className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full">
                            <Search size={18} className="text-slate-600" />
                            <input className="w-full bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                        </form>

                        <Link href="/wishlist" className="relative flex items-center gap-2 text-slate-600">
                            <Heart size={18} />
                            Wishlist
                            {wishlistCount > 0 && (
                                <button className="absolute -top-1 left-16 text-[8px] text-white bg-red-500 size-3.5 rounded-full">{wishlistCount}</button>
                            )}
                        </Link>

                        <Link href="/cart" className="relative flex items-center gap-2 text-slate-600">
                            <ShoppingCart size={18} />
                            Cart
                            <button className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">{cartCount}</button>
                        </Link>

                    {
                        !user ? (
                            <Link href="/sign-in" className="px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full">
                            Login
                            </Link>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button onClick={() => router.push('/orders')} className="px-4 py-2 text-sm rounded-full hover:bg-slate-100">
                                    {user.fullName || 'Account'}
                                </button>
                                <button onClick={handleSignOut} className="p-2 hover:bg-slate-100 rounded-full" title="Sign out">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )
                    }
                        

                    </div>

                    {/* Mobile User Button  */}
                    <div className="sm:hidden">
                        { user ? (
                            <div className="flex items-center gap-2">
                                <button onClick={() => router.push('/cart')} className="p-2">
                                    <ShoppingCart size={20} />
                                </button>
                                <button onClick={() => router.push('/orders')} className="p-2">
                                    <PackageIcon size={20} />
                                </button>
                                <button onClick={handleSignOut} className="p-2">
                                    <LogOut size={20} />
                                </button>
                            </div>
                        ) : (
                            <Link href="/sign-in" className="px-7 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-sm transition text-white rounded-full">
                            Login
                        </Link>
                        )
                        }
                        
                    </div>
                </div>
            </div>
            <hr className="border-gray-300" />
        </nav>
    )
}

export default Navbar