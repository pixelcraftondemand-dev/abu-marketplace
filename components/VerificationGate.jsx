"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import axios from "axios";

/**
 * Blocks unverified accounts from using the marketplace until they complete
 * email verification (OTP). Applies to every sign-in method — email/password
 * and OAuth (Google) alike — so a first-time Google sign-in is forced through
 * the same verification step as everyone else.
 *
 * The check reads `emailVerified` from the database via /api/auth/status and
 * cannot be bypassed with frontend state. The /verify-email page itself is
 * exempt so the flow can complete.
 *
 * The verified result is cached (`verified === true` skips future checks), but
 * an unverified user is re-checked on every navigation and bounced back to
 * /verify-email until they actually complete it. The cache resets when the
 * signed-in account changes.
 */
export default function VerificationGate({ children }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [verified, setVerified] = useState(null);

  // Reset the cached result when the signed-in account changes.
  useEffect(() => {
    setVerified(null);
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    // Never redirect the verification page into itself.
    if (pathname.includes("/verify-email")) return;
    // Confirmed verified — never bother the server again.
    if (verified === true) return;

    let cancelled = false;
    axios
      .get("/api/auth/status")
      .then(({ data }) => {
        if (cancelled) return;
        if (data.verified) {
          setVerified(true);
        } else {
          router.replace("/verify-email");
        }
      })
      .catch((error) => {
        // A transient failure must not lock anyone out — the next navigation
        // simply re-checks instead of redirecting on bad network luck.
        if (cancelled) return;
        console.warn("[VerificationGate] status check failed:", error?.message || error);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, pathname, router, verified]);

  return children;
}
