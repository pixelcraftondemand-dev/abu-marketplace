"use client";

import Image from "next/image";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ShieldCheck, Lock, Truck } from "lucide-react";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";
import heroModelImage from "@/assets/hero_model_img.png";

const clerkAppearance = {
  variables: {
    colorPrimary: "#C9A96E",
    colorBackground: "#ffffff",
    colorText: "#0F172A",
    colorTextSecondary: "#667085",
    colorInputText: "#0F172A",
    colorInputPlaceholder: "#94A3B8",
    colorInputBackground: "#F8FAFC",
    colorBorder: "#E2E8F0",
    colorBorderInput: "#CBD5E1",
    colorBorderInputAccent: "#C9A96E",
    colorTextLink: "#C9A96E",
  },
  elements: {
    card: "shadow-none border-0 bg-transparent w-full",
    headerTitle: "text-3xl font-semibold text-slate-950",
    headerSubtitle: "text-sm text-slate-500",
    formButtonPrimary: "rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-3 text-sm font-semibold shadow-sm",
    formFieldInput: "rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100",
    footerActionLink: "text-amber-600 font-semibold hover:text-amber-700",
    footerHintText: "text-sm text-slate-500",
  },
};

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-[1700px] flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_24px_120px_rgba(15,23,42,0.12)] lg:flex-row">
        <section className="relative flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-6/12 lg:px-14 lg:py-16">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-100 to-transparent" />
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900">
              <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 shadow-sm">
                <Image src={marketplaceLogo} alt="ABU Marketplace" className="h-6 w-6" width={24} height={24} />
              </span>
              ABU Marketplace
            </Link>

            <div className="mt-10 max-w-xl animate-fade-up">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-500">Welcome back</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Sign in to your ABU marketplace account
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Access saved stores, orders, and buyer protection on a premium shopper experience built for trust and convenience.
              </p>
            </div>

            <div className="mt-10 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm animate-fade-up">
              <SignIn appearance={clerkAppearance} signUpUrl="/sign-up" />

              <p className="mt-6 text-center text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/sign-up" className="font-semibold text-amber-600 hover:text-amber-700">
                  Sign up
                </Link>
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3 animate-fade-up">
              <div className="flex items-start gap-3 rounded-3xl bg-slate-50 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Secure checkout</p>
                  <p className="text-sm text-slate-500">Your payment details stay protected.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-3xl bg-slate-50 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Lock size={20} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Buyer protection</p>
                  <p className="text-sm text-slate-500">Trusted sellers and guaranteed support.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-3xl bg-slate-50 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Truck size={20} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Fast order tracking</p>
                  <p className="text-sm text-slate-500">Track your marketplace orders in one place.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="relative hidden lg:flex lg:w-6/12 lg:flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900" />
          <div className="relative z-10 flex flex-1 flex-col justify-between p-10">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.35)]">
              <span className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">Premium experience</span>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white">Buy with confidence on ABU Marketplace.</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
                Discover curated products from trusted sellers with built-in protection and exceptional support.
              </p>
            </div>

            <div className="relative mt-10 overflow-hidden rounded-[32px] border border-white/10 bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.4)]">
              <Image src={heroModelImage} alt="ABU Marketplace hero" className="h-full w-full object-cover" fill />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
