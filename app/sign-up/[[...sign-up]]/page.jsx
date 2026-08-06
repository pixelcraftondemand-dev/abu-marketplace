"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import BrandLogo from "@/components/BrandLogo";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#0B0F19] py-12 px-4 text-white flex items-center justify-center">
      <div className="mx-auto w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:flex flex-col justify-center gap-6 p-8">
          <BrandLogo
            className="justify-start"
            brandClassName="text-white"
            taglineClassName="text-slate-400"
            compact={false}
          />
          <h1 className="text-4xl font-semibold text-white">Create an account</h1>
          <p className="text-slate-300 max-w-xl">
            Join ABU Marketplace to shop verified sellers, save favorites, and get faster checkout. Enjoy localised pricing and language support across Africa.
          </p>
          <ul className="text-sm text-slate-400 list-disc list-inside">
            <li>Secure sign-up with email or social providers</li>
            <li>Localized prices and languages</li>
            <li>Fast returns and trusted sellers</li>
          </ul>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-white/5 p-8 shadow-xl">
            <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" afterSignUpUrl="/" />
            <p className="mt-4 text-center text-sm text-slate-300">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-semibold text-amber-400 hover:text-amber-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
