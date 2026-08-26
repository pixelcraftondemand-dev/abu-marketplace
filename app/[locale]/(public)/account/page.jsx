"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk, UserProfile } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useDispatch } from 'react-redux';
import { openSignInModal } from '@/lib/features/signInModalSlice';
import axios from "axios";
import {
  ArrowRight,
  ClipboardList,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  PlusCircle,
  ShoppingBag,
  Store,
  Wallet,
  User as UserIcon,
} from "lucide-react";
import PageTitle from "@/components/PageTitle";
import Loading from "@/components/Loading";

const QUICK_LINKS = [
  { label: "My Orders", href: "/orders", icon: Package, hint: "Track orders & deliveries" },
  { label: "Wishlist", href: "/wishlist", icon: Heart, hint: "Items you've saved" },
  { label: "Wallet", href: "/wallet", icon: Wallet, hint: "Balance & top-up" },
  { label: "Cart", href: "/cart", icon: ShoppingBag, hint: "Your shopping bag" },
];

const SELLER_LINKS = [
  { label: "Store dashboard", href: "/store", icon: LayoutDashboard, hint: "Overview & analytics" },
  { label: "Add product", href: "/store/add-product", icon: PlusCircle, hint: "List a new item" },
  { label: "Manage products", href: "/store/manage-product", icon: ClipboardList, hint: "Edit & stock control" },
  { label: "Store orders", href: "/store/orders", icon: Package, hint: "Fulfil customer orders" },
];

export default function AccountPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const dispatch = useDispatch();
  const [sellerStatus, setSellerStatus] = useState({
    checking: true,
    isSeller: false,
    storeInfo: null,
  });

  useEffect(() => {
    if (!userLoaded) return;

    if (!user) {
      setSellerStatus((s) => ({ ...s, checking: false }));
      return;
    }

    let active = true;
    axios
      .get("/api/store/is-seller")
      .then(({ data }) => {
        if (!active) return;
        if (data.isSeller) {
          setSellerStatus({ checking: false, isSeller: true, storeInfo: data.storeInfo || null });
        } else {
          setSellerStatus({ checking: false, isSeller: false, storeInfo: null });
        }
      })
      .catch(() => {
        if (!active) return;
        setSellerStatus({ checking: false, isSeller: false, storeInfo: null });
      });

    return () => { active = false; };
  }, [user, userLoaded]);

  if (!userLoaded) return <Loading />;

  if (!user) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <UserIcon className="text-gray-400" size={28} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in to continue</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Sign in to view your orders, wallet, and account settings.
          </p>
          <button
            onClick={() => dispatch(openSignInModal())}
            className="mt-6 w-full bg-[var(--color-primary)] text-white py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const email = user.primaryEmailAddress?.emailAddress || "";
  const createdAt = user.createdAt ? new Date(user.createdAt) : null;
  const joinedAt =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleDateString(undefined, { year: "numeric", month: "long" })
      : "";

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <PageTitle heading="My Account" text="Manage your profile, orders, wallet and store" />

        {/* Profile header */}
        <section className="relative overflow-hidden rounded-2xl bg-gray-900 p-8 text-white shadow-xl sm:p-10">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName || "Profile"}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white/10"
              />
            ) : (
              <span className="w-20 h-20 shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <UserIcon size={36} strokeWidth={1.5} className="text-white" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                {joinedAt ? `Member since ${joinedAt}` : "Your account"}
              </p>
              <h1 className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">
                {user.fullName || "My Account"}
              </h1>
              {email && <p className="mt-1.5 truncate text-sm text-white/50">{email}</p>}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Quick links */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Shopping
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {QUICK_LINKS.map(({ label, href, icon: Icon, hint }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-3.5 rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all duration-200 hover:border-gray-200 hover:bg-white hover:shadow-sm hover:-translate-y-0.5"
                  >
                    <span className="w-10 h-10 shrink-0 bg-blue-50 rounded-xl flex items-center justify-center text-[var(--color-primary)] transition-colors duration-200 group-hover:bg-blue-100">
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-800">{label}</span>
                      <span className="block truncate text-xs text-gray-400">{hint}</span>
                    </span>
                    <ArrowRight
                      size={14}
                      className="ml-auto shrink-0 text-gray-300 transition-all duration-200 group-hover:text-gray-600 group-hover:translate-x-0.5"
                    />
                  </Link>
                ))}
              </div>
            </section>

            {/* Seller card */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              {sellerStatus.checking ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                  Checking seller status…
                </div>
              ) : sellerStatus.isSeller ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Seller tools
                      </p>
                      <h2 className="mt-1.5 text-lg font-bold text-gray-900">
                        {sellerStatus.storeInfo?.name || "Your store"}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Manage your storefront, products and orders.
                      </p>
                    </div>
                    {sellerStatus.storeInfo?.username && (
                      <Link
                        href={`/shop/${sellerStatus.storeInfo.username}`}
                        className="hidden shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-gray-800 hover:shadow-lg sm:flex"
                      >
                        <Store size={14} /> View store
                      </Link>
                    )}
                  </div>
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {SELLER_LINKS.map(({ label, href, icon: Icon, hint }) => (
                      <Link
                        key={href}
                        href={href}
                        className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all duration-200 hover:border-gray-200 hover:bg-white hover:shadow-sm"
                      >
                        <span className="w-9 h-9 shrink-0 bg-blue-50 rounded-lg flex items-center justify-center text-[var(--color-primary)] transition-colors duration-200 group-hover:bg-blue-100">
                          <Icon size={16} strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-gray-800">{label}</span>
                          <span className="block truncate text-xs text-gray-400">{hint}</span>
                        </span>
                        <ArrowRight
                          size={14}
                          className="ml-auto shrink-0 text-gray-300 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:text-gray-600"
                        />
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Sell on ABU
                    </p>
                    <h2 className="mt-1.5 text-lg font-bold text-gray-900">Become a seller</h2>
                    <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                      Open a storefront and reach shoppers across Africa.
                    </p>
                  </div>
                  <Link
                    href="/create-store"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5"
                  >
                    Create your store <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Right column: account settings */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-fit">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Account settings
            </p>
            <h2 className="mt-1.5 text-lg font-bold text-gray-900">Profile &amp; security</h2>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              Update your name, email, password and security settings.
            </p>
            <div className="mt-6">
              <UserProfile routing="hash" />
            </div>
          </section>
        </div>

        {/* Sign out */}
        <section className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">
                Session
              </p>
              <h2 className="mt-1.5 text-lg font-bold text-gray-900">Sign out of this device</h2>
              <p className="mt-1 text-sm text-gray-500">
                You will need to sign in again to access your orders, wallet and account settings.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
