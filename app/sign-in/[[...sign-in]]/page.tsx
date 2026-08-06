"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import BrandLogo from "@/components/BrandLogo";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 text-slate-900">
      <div className="mx-auto max-w-[800px]">
        <div className="mb-10 text-center">
          <BrandLogo
            className="justify-center"
            brandClassName="text-slate-900"
            taglineClassName="text-slate-500"
            compact={false}
          />
          <h1 className="mt-8 text-4xl font-semibold">Sign in to ABU Marketplace</h1>
          <p className="mt-3 text-slate-600">
            Access your account with secure email sign in or OTP verification.
          </p>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl">
          <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" afterSignInUrl="/" />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to ABU Marketplace?{' '}
          <Link href="/sign-up" className="font-semibold text-amber-600 hover:text-amber-500">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
