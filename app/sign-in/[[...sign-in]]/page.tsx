"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import SignInModal from "@/components/SignInModal";

/**
 * Passwordless sign-in page. The form stays visible while Clerk hydrates so a
 * slow auth client does not hide the login options.
 */
export default function SignInPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) return null;

  return (
    <main className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-4 w-full max-w-[420px]">
        <Link
          href="/"
          className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          ← Back to marketplace
        </Link>
      </div>
      <SignInModal
        open
        standalone
        initialStep="email"
        onClose={() => router.push("/")}
      />
    </main>
  );
}
