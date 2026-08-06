"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BadgeCheck,
  Clock3,
  Loader2,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();

  const [state, setState] = useState("verifying"); // verifying | verified | already_verified | invalid | expired | error
  const [resending, setResending] = useState(false);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = searchParams.get("token");
    if (!token) {
      setState("invalid");
      setCanResend(true);
      return;
    }

    (async () => {
      try {
        const { data } = await axios.post("/api/auth/verify-email", { token });
        if (cancelled) return;
        if (data.verified) {
          setState(data.alreadyVerified ? "already_verified" : "verified");
        } else {
          setState("invalid");
          setCanResend(true);
        }
      } catch (error) {
        if (cancelled) return;
        const status = error?.response?.status;
        if (status === 410) {
          setState("expired");
          setCanResend(true);
        } else if (status === 429) {
          toast.error(error.response.data.error || "Too many attempts.");
          setState("verifying");
          setCanResend(true);
        } else {
          setState("error");
          setCanResend(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleResend = async () => {
    if (!user) return;
    setResending(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/auth/send-verification",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(data.message || "Verification email sent.");
      setState("verifying");
      setCanResend(false);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to resend the verification email.");
    } finally {
      setResending(false);
    }
  };

  const states = {
    verifying: {
      icon: <Loader2 className="animate-spin text-[#C9A96E]" size={44} strokeWidth={1.5} />,
      title: "Verifying your email…",
      text: "Please wait a moment while we confirm your email address.",
    },
    verified: {
      icon: <BadgeCheck className="text-emerald-500" size={52} strokeWidth={1.5} />,
      title: "Email verified!",
      text: "Your ABU Marketplace account is now active. Welcome aboard!",
    },
    already_verified: {
      icon: <MailCheck className="text-emerald-500" size={52} strokeWidth={1.5} />,
      title: "Already verified",
      text: "This email address was already confirmed. Nothing else is needed.",
    },
    invalid: {
      icon: <AlertTriangle className="text-amber-500" size={52} strokeWidth={1.5} />,
      title: "Invalid verification link",
      text: "This link is not valid. Please request a new verification email below.",
    },
    expired: {
      icon: <Clock3 className="text-amber-500" size={52} strokeWidth={1.5} />,
      title: "Link expired",
      text: "This verification link has expired. Please request a new one below.",
    },
    error: {
      icon: <AlertTriangle className="text-red-500" size={52} strokeWidth={1.5} />,
      title: "Something went wrong",
      text: "We could not verify your email right now. Please try again shortly.",
    },
  };

  const current = states[state] || states.error;

  return (
    <div className="mx-6 flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E8DCC8] bg-white p-10 text-center shadow-[0_25px_70px_rgba(34,34,34,0.08)]">
        <BrandLogo
          className="justify-center"
          brandClassName="text-[#1A1A1A]"
          taglineClassName="text-[#8f7d61]"
          compact
        />
        <div className="mt-8 flex justify-center">{current.icon}</div>
        <h1 className="mt-5 text-2xl font-semibold text-[#1A1A1A]">{current.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#6A6053]">{current.text}</p>

        {state === "verified" || state === "already_verified" ? (
          <Link
            href="/"
            className="mt-8 inline-block rounded-full bg-[#1A1A1A] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#C9A96E]"
          >
            Continue to ABU Marketplace
          </Link>
        ) : (
          <div className="mt-8 space-y-3">
            {userLoaded && user ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9A96E] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                Resend verification email
              </button>
            ) : (
              <p className="text-xs text-[#8C8071]">
                Signed out?{" "}
                <Link href="/sign-in" className="font-semibold text-[#C9A96E] hover:underline">
                  Sign in
                </Link>{" "}
                to resend the verification email.
              </p>
            )}
            <Link
              href="/"
              className="block text-center text-sm font-medium text-[#6A6053] hover:text-[#1A1A1A] transition"
            >
              Return home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <Loader2 className="animate-spin text-[#C9A96E]" size={28} />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
