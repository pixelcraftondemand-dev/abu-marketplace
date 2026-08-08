"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk, UserProfile } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
        setSellerStatus({ checking: false, isSeller: true, storeInfo: data.storeInfo || null });
      })
      .catch(() => {
        if (!active) return;
        setSellerStatus({ checking: false, isSeller: false, storeInfo: null });
      });

    return () => {
      active = false;
    };
  }, [user, userLoaded]);

  if (!userLoaded) return <Loading />;

  if (!user) {
    return (
      <div className="mx-6 flex min-h-[80vh] items-center justify-center">
        <div className="max-w-lg rounded-[2rem] border border-[#E8DCC8] bg-white p-8 text-center shadow-sm">
          <UserIcon className="mx-auto text-[#C9A96E]" size={40} strokeWidth={1.5} />
          <h1 className="mt-4 text-3xl font-semibold text-[#1A1A1A]">Please sign in to continue</h1>
          <p className="mt-3 text-sm leading-6 text-[#6A6053]">
            Sign in to view your orders, wallet, and account settings.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-block rounded-full bg-[#1A1A1A] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#C9A96E]"
          >
            Sign in
          </Link>
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
    <div className="mx-6 my-10 min-h-screen text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl">
        <PageTitle heading="My Account" text="Manage your profile, orders, wallet and store" />

        {/* Profile header */}
        <section className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-8 text-white shadow-[0_25px_70px_rgba(17,17,17,0.25)] sm:p-10">
          <div className="absolute -right-16 -top-16 size-56 rounded-full bg-[#C9A96E]/20 blur-3xl" />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName || "Profile"}
                width={80}
                height={80}
                className="size-20 rounded-full object-cover ring-4 ring-[#C9A96E]/40"
              />
            ) : (
              <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-[#C9A96E] text-[#1A1A1A]">
                <UserIcon size={36} strokeWidth={1.5} />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A96E]">
                {joinedAt ? `Member since ${joinedAt}` : "Your account"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {user.fullName || "My Account"}
              </h1>
              {email && <p className="mt-2 truncate text-sm text-white/70">{email}</p>}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left column */}
          <div className="space-y-8">
            {/* Quick links */}
            <section className="rounded-[2rem] border border-[#E8DCC8] bg-white p-8 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#A2825F]">
                Shopping
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {QUICK_LINKS.map(({ label, href, icon: Icon, hint }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-4 rounded-3xl border border-[#E8DCC8] bg-[#FCF7EE] p-5 transition hover:border-[#C9A96E] hover:bg-white hover:shadow-sm"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#8A6A3A] shadow-sm transition group-hover:bg-[#F6E8C6]">
                      <Icon size={20} strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#1A1A1A]">{label}</span>
                      <span className="block truncate text-xs text-[#8C8071]">{hint}</span>
                    </span>
                    <ArrowRight
                      size={16}
                      className="ml-auto shrink-0 text-[#C9A96E] opacity-0 transition group-hover:opacity-100"
                    />
                  </Link>
                ))}
              </div>
            </section>

            {/* Seller card */}
            <section className="rounded-[2rem] border border-[#E8DCC8] bg-white p-8 shadow-sm">
              {sellerStatus.checking ? (
                <div className="flex items-center justify-center py-8 text-sm text-[#8C8071]">
                  Checking seller status…
                </div>
              ) : sellerStatus.isSeller ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#A2825F]">
                        Seller tools
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">
                        {sellerStatus.storeInfo?.name || "Your store"}
                      </h2>
                      <p className="mt-1 text-sm text-[#6A6053]">
                        Manage your storefront, products and orders.
                      </p>
                    </div>
                    {sellerStatus.storeInfo?.username && (
                      <Link
                        href={`/shop/${sellerStatus.storeInfo.username}`}
                        className="hidden shrink-0 items-center gap-2 rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold transition hover:bg-[#1A1A1A] hover:text-white sm:flex"
                      >
                        <Store size={16} /> View store
                      </Link>
                    )}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {SELLER_LINKS.map(({ label, href, icon: Icon, hint }) => (
                      <Link
                        key={href}
                        href={href}
                        className="group flex items-center gap-4 rounded-3xl border border-[#E8DCC8] bg-[#FCF7EE] p-5 transition hover:border-[#C9A96E] hover:bg-white hover:shadow-sm"
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#8A6A3A] shadow-sm transition group-hover:bg-[#F6E8C6]">
                          <Icon size={20} strokeWidth={1.5} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[#1A1A1A]">{label}</span>
                          <span className="block truncate text-xs text-[#8C8071]">{hint}</span>
                        </span>
                        <ArrowRight
                          size={16}
                          className="ml-auto shrink-0 text-[#C9A96E] opacity-0 transition group-hover:opacity-100"
                        />
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#A2825F]">
                      Sell on ABU
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">Become a seller</h2>
                    <p className="mt-1 text-sm leading-6 text-[#6A6053]">
                      Open a storefront and reach shoppers across Africa.
                    </p>
                  </div>
                  <Link
                    href="/create-store"
                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9A96E]"
                  >
                    Create your store <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Right column: account settings */}
          <section className="h-fit rounded-[2rem] border border-[#E8DCC8] bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#A2825F]">
              Account settings
            </p>
            <h2 className="mt-2 text-xl font-semibold">Profile &amp; security</h2>
            <p className="mt-1 text-sm leading-6 text-[#6A6053]">
              Update your name, email, password and security settings.
            </p>
            <div className="mt-6">
              <UserProfile routing="hash" />
            </div>
          </section>
        </div>

        {/* Sign out */}
        <section className="mt-8 rounded-[2rem] border border-[#EFD6C8] bg-[#FEF6F3] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#B0552E]">
                Session
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#1A1A1A]">Sign out of this device</h2>
              <p className="mt-1 text-sm leading-6 text-[#6A6053]">
                You will need to sign in again to access your orders, wallet and account settings.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white active:scale-95"
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
