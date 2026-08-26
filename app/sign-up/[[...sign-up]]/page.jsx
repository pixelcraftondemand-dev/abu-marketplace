"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import BrandLogo from "@/components/BrandLogo";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
      <div className="mx-auto w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left — Brand message */}
        <div className="hidden lg:flex flex-col justify-center gap-6 p-8">
          <BrandLogo
            className="justify-start"
            brandClassName="text-gray-900"
            taglineClassName="text-gray-500"
            compact={false}
          />
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Create an account</h1>
          <p className="text-gray-500 max-w-xl leading-relaxed">
            Join ABU Marketplace to shop verified sellers, save favorites, and get faster checkout. Enjoy localised pricing and language support across Africa.
          </p>
          <ul className="text-sm text-gray-500 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs">✓</span>
              Secure sign-up with email or social providers
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs">✓</span>
              Localized prices and languages
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs">✓</span>
              Fast returns and trusted sellers
            </li>
          </ul>
        </div>

        {/* Right — Sign up form */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" afterSignUpUrl="/verify-email" />
            <p className="mt-4 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-semibold text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
