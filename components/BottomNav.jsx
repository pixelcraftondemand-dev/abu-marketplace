'use client'
import { useEffect, useState } from 'react';
import { CircleUserRound, Heart, ShoppingBag, ShoppingCart, Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { stripLocaleFromPath } from '@/lib/utils/locale';
import { getStoreLinkTarget } from '@/lib/storeNavigation';
import { useTranslation } from '@/lib/i18n';

const BottomNav = () => {
    const pathname = stripLocaleFromPath(usePathname());
    const { user, isLoaded } = useUser();
    const { t } = useTranslation();
    const cartCount = useSelector((state) => state.cart.total);
    const wishlistCount = useSelector((state) => state.wishlist.items.length);
    const [storeHref, setStoreHref] = useState('/sign-in');

    useEffect(() => {
        let cancelled = false;

        const resolveStoreHref = async () => {
            if (!isLoaded) return;

            if (!user) {
                setStoreHref(getStoreLinkTarget({ isSignedIn: false, isSeller: false }));
                return;
            }

            try {
                const { data } = await axios.get('/api/store/is-seller');
                if (!cancelled) {
                    setStoreHref(getStoreLinkTarget({
                        isSignedIn: true,
                        isSeller: Boolean(data.isSeller),
                    }));
                }
            } catch (error) {
                console.error('[BottomNav] Unable to resolve seller navigation', error);
                if (!cancelled) setStoreHref('/create-store');
            }
        };

        resolveStoreHref();
        return () => {
            cancelled = true;
        };
    }, [isLoaded, user]);

    const tabs = [
        { key: 'buy', label: t('nav.buy'), href: '/shop', icon: ShoppingBag, isActive: pathname.startsWith('/shop') },
        {
            key: 'sell',
            label: t('nav.sell'),
            href: storeHref,
            icon: Store,
            isActive: pathname.startsWith('/store') || pathname === '/create-store',
        },
        { key: 'wishlist', label: t('nav.wishlist'), href: '/wishlist', icon: Heart, isActive: pathname === '/wishlist', badge: wishlistCount },
        { key: 'cart', label: t('nav.cart'), href: '/cart', icon: ShoppingCart, isActive: pathname === '/cart', badge: cartCount },
        { key: 'account', label: t('nav.account'), href: '/account', icon: CircleUserRound, isActive: pathname === '/account' },
    ];

    return (
        <nav 
            aria-label="Mobile navigation" 
            className="fixed inset-x-0 bottom-0 z-50 sm:hidden"
        >
            <div className="mx-2 mb-2 rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
                <div className="flex items-center justify-around">
                    {tabs.map(({ key, label, href, icon: Icon, isActive, badge }) => (
                        <Link
                            key={key}
                            href={href}
                            aria-current={isActive ? 'page' : undefined}
                            className={`relative flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200 ${
                                isActive
                                    ? 'text-[var(--color-primary)]'
                                    : 'text-gray-400 active:text-gray-600'
                            }`}
                        >
                            {/* Active indicator dot */}
                            {isActive && (
                                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[var(--color-primary)] rounded-full" />
                            )}
                            
                            <span className="relative">
                                <Icon
                                    size={22}
                                    strokeWidth={isActive ? 2.5 : 1.8}
                                    className={`transition-all duration-200 ${
                                        key === 'wishlist' && isActive ? 'fill-[var(--color-primary)]' : ''
                                    }`}
                                />
                                {badge > 0 && (
                                    <span className="absolute -right-2.5 -top-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full shadow-sm shadow-red-500/30">
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </span>
                            <span className={`text-[10px] leading-tight transition-all duration-200 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {label}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;
