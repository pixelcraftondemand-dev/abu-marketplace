'use client'
import { CircleUserRound, Heart, House, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useSession } from '@/lib/authClient';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';

const BottomNav = () => {
    const pathname = usePathname();
    const cartCount = useSelector((state) => state.cart.total);
    const wishlistCount = useSelector((state) => state.wishlist.items.length);
    const { data: session } = useSession();
    const user = session?.user;
    const tabs = [
        { label: 'Home', href: '/', icon: House, isActive: pathname === '/' },
        { label: 'Shop', href: '/shop', icon: ShoppingBag, isActive: pathname.startsWith('/shop') },
        { label: 'Wishlist', href: '/wishlist', icon: Heart, isActive: pathname === '/wishlist', badge: wishlistCount },
        { label: 'Cart', href: '/cart', icon: ShoppingCart, isActive: pathname === '/cart', badge: cartCount },
        { label: 'Account', href: user ? '/orders' : '/sign-in', icon: CircleUserRound, isActive: pathname === '/orders' || pathname.startsWith('/sign-in') },
    ];

    return (
        <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden">
            <div className="mx-auto flex max-w-md items-center justify-around">
                {tabs.map(({ label, href, icon: Icon, isActive, badge }) => (
                    <Link key={label} href={href} className={`relative flex min-w-12 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] ${isActive ? 'font-semibold text-green-600' : 'text-slate-500'}`}>
                        <span className="relative">
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={label === 'Wishlist' && isActive ? 'fill-green-600' : ''} />
                            {badge > 0 && <span className="absolute -right-3 -top-2 grid min-w-4 place-items-center rounded-full bg-green-600 px-1 text-[10px] leading-4 text-white">{badge > 99 ? '99+' : badge}</span>}
                        </span>
                        {label}
                    </Link>
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;
