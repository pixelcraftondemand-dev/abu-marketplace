"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "abu_cookie_consent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const handleChoice = (choice) => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ choice, timestamp: new Date().toISOString() })
    );
    // Only load analytics / marketing scripts after "accept".
    // Example: if (choice === "accept") loadAnalytics();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-4 shadow-lg sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-sm text-gray-700">
          We use cookies to run this site and, with your permission, to
          understand how it's used and to personalize your experience. Read
          our{" "}
          <Link href="/terms-and-conditions" className="underline hover:text-gray-900">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="underline hover:text-gray-900">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="flex shrink-0 gap-3">
          <button
            onClick={() => handleChoice("decline")}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={() => handleChoice("accept")}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}