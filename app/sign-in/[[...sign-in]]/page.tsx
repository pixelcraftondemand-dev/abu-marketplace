"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import SignInModal from "@/components/SignInModal";
import BrandLogo from "@/components/BrandLogo";

/**
 * /sign-in page — renders the same SignInModal inline so users who arrive
 * via bookmark or shared link see the same passwordless experience.
 * If already signed in, redirects home immediately.
 */
export default function SignInPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show a loading state while Clerk hydrates
  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <BrandLogo
          className="justify-center"
          brandClassName="text-[#1A1A1A]"
          taglineClassName="text-[#8f7d61]"
          compact={false}
        />
      </main>
    );
  }

  // Already signed in — redirect happened in useEffect, show nothing
  if (isSignedIn) return null;

  return (
    <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <SignInModal
        open={open}
        onClose={() => {
          // If they close the modal, send them home
          router.push("/");
        }}
      />
    </main>
  );
}
