"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import BrandLogo from "@/components/BrandLogo";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandLogo
            className="justify-center"
            brandClassName="text-slate-900"
            taglineClassName="text-slate-500"
            compact={false}
          />
          <h1 className="mt-8 text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to continue shopping on ABU Marketplace.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            afterSignInUrl="/"
            appearance={{
              elements: {
                headerTitle: "text-xl font-semibold",
                headerSubtitle: "text-sm",
              },
            }}
          />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to ABU Marketplace?{" "}
          <Link href="/sign-up" className="font-semibold text-amber-600 hover:text-amber-500">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
