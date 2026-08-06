"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BadgeCheck,
  Clock3,
  KeyRound,
  Loader2,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const RESEND_COOLDOWN_SECONDS = 30;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();

  // entry | verifying | verified | already_verified | invalid | expired | error
  const [state, setState] = useState("entry");
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [notice, setNotice] = useState(null); // { type: 'error' | 'info', text }
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);
  const verifyingRef = useRef(false);

  const code = digits.join("");

  // ── Legacy support: links from previously-sent verification emails still
  //    carry ?token=… and are auto-verified exactly as before. ─────────────
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    setState("verifying");
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.post("/api/auth/verify-email", { token });
        if (cancelled) return;
        setState(data.alreadyVerified ? "already_verified" : "verified");
      } catch (error) {
        if (cancelled) return;
        const status = error?.response?.status;
        if (status === 410) setState("expired");
        else if (status === 429) {
          toast.error(error?.response?.data?.error || "Too many attempts.");
          setState("entry");
        } else {
          setState("invalid");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Auto-focus the first code box once the form is visible.
  useEffect(() => {
    if (state === "entry") {
      inputRefs.current[0]?.focus();
    }
  }, [state]);

  const verifyCode = useCallback(
    async (submittedCode) => {
      if (verifyingRef.current) return;
      verifyingRef.current = true;
      setNotice(null);
      setState("verifying");
      try {
        const { data } = await axios.post("/api/auth/verify-email", {
          code: submittedCode,
        });
        setState(data.alreadyVerified ? "already_verified" : "verified");
      } catch (error) {
        const status = error?.response?.status;
        let message;
        if (status === 429) {
          message =
            error?.response?.data?.error || "Too many attempts. Please try again later.";
        } else if (status === 410) {
          message = "This code has expired. Request a new one below.";
        } else if (status === 422 || status === 400) {
          message = "That code is not correct. Please check your email and try again.";
        } else {
          message = "We could not verify your email right now. Please try again shortly.";
        }
        // Clear the boxes so a wrong code can never loop auto-submit itself.
        setDigits(Array(6).fill(""));
        setNotice({ type: "error", text: message });
        setState("entry");
        inputRefs.current[0]?.focus();
      } finally {
        verifyingRef.current = false;
      }
    },
    []
  );

  // Auto-submit as soon as all six digits are filled in.
  useEffect(() => {
    if (state === "entry" && code.length === 6) {
      verifyCode(code);
    }
  }, [code, state, verifyCode]);

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (notice) setNotice(null);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
      .split("");
    if (!pasted.length) return;
    const next = Array(6).fill("");
    pasted.forEach((digit, i) => {
      next[i] = digit;
    });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length < 6) {
      setNotice({ type: "error", text: "Please enter the 6-digit code from your email." });
      return;
    }
    verifyCode(code);
  };

  const handleResend = async () => {
    if (!user || resending || cooldown > 0) return;
    setResending(true);
    setNotice(null);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/auth/send-verification",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.alreadyVerified) {
        setState("already_verified");
        return;
      }
      toast.success(data.message || "Verification code sent.");
      setDigits(Array(6).fill(""));
      setState("entry");
      setNotice({ type: "info", text: "A new 6-digit code is on its way to your inbox." });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to resend the verification code.");
    } finally {
      setResending(false);
    }
  };

  // Resend cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const states = {
    verifying: {
      icon: <Loader2 className="animate-spin text-[#C9A96E]" size={44} strokeWidth={1.5} />,
      title: "Verifying your code…",
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
      text: "This link is not valid. Please request a new verification code below.",
    },
    expired: {
      icon: <Clock3 className="text-amber-500" size={52} strokeWidth={1.5} />,
      title: "Code expired",
      text: "This verification code has expired. Please request a new one below.",
    },
    error: {
      icon: <AlertTriangle className="text-red-500" size={52} strokeWidth={1.5} />,
      title: "Something went wrong",
      text: "We could not verify your email right now. Please try again shortly.",
    },
  };

  const current = states[state] || states.error;
  const isDone = state === "verified" || state === "already_verified";
  const isBusy = state === "verifying";

  return (
    <div className="mx-6 flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E8DCC8] bg-white p-10 text-center shadow-[0_25px_70px_rgba(34,34,34,0.08)]">
        <BrandLogo
          className="justify-center"
          brandClassName="text-[#1A1A1A]"
          taglineClassName="text-[#8f7d61]"
          compact
        />

        {isDone ? (
          <>
            <div className="mt-8 flex justify-center">{current.icon}</div>
            <h1 className="mt-5 text-2xl font-semibold text-[#1A1A1A]">{current.title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#6A6053]">{current.text}</p>
            <Link
              href="/"
              className="mt-8 inline-block rounded-full bg-[#1A1A1A] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#C9A96E]"
            >
              Continue to ABU Marketplace
            </Link>
          </>
        ) : state === "invalid" || state === "expired" || state === "error" ? (
          <>
            <div className="mt-8 flex justify-center">{current.icon}</div>
            <h1 className="mt-5 text-2xl font-semibold text-[#1A1A1A]">{current.title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#6A6053]">{current.text}</p>
            <div className="mt-8 space-y-3">
              {userLoaded && user ? (
                <button
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9A96E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resending ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Request a new code"}
                </button>
              ) : (
                <p className="text-xs text-[#8C8071]">
                  Signed out?{" "}
                  <Link href="/sign-in" className="font-semibold text-[#C9A96E] hover:underline">
                    Sign in
                  </Link>{" "}
                  to request a new code.
                </p>
              )}
              <Link
                href="/"
                className="block text-center text-sm font-medium text-[#6A6053] transition hover:text-[#1A1A1A]"
              >
                Return home
              </Link>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="flex justify-center">
              <KeyRound className="text-[#C9A96E]" size={40} strokeWidth={1.5} />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-[#1A1A1A]">Enter your verification code</h1>
            <p className="mt-3 text-sm leading-6 text-[#6A6053]">
              We sent a 6-digit code to your email. Enter it below to activate
              your ABU Marketplace account.
            </p>

            {/* Code boxes */}
            <div className="mt-7 flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={2}
                  value={digit}
                  disabled={isBusy}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  aria-label={`Digit ${index + 1}`}
                  className={`h-14 w-11 sm:h-16 sm:w-13 rounded-2xl border text-center text-2xl font-semibold text-[#1A1A1A] outline-none transition focus:border-[#C9A96E] focus:ring-2 focus:ring-[#C9A96E]/30 disabled:opacity-60 ${
                    notice?.type === "error" ? "border-red-300" : "border-[#E8DCC8]"
                  }`}
                />
              ))}
            </div>

            {/* Inline notice */}
            {notice && (
              <p
                className={`mt-4 text-sm ${
                  notice.type === "error" ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {notice.text}
              </p>
            )}

            {isBusy && (
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[#8C8071]">
                <Loader2 className="animate-spin" size={14} /> Verifying…
              </p>
            )}

            <button
              type="submit"
              disabled={isBusy || code.length < 6}
              className="mt-7 w-full rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9A96E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Verify email
            </button>

            <div className="mt-5 space-y-3">
              {userLoaded && user ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  className="flex w-full items-center justify-center gap-2 text-sm font-medium text-[#6A6053] transition hover:text-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resending ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get the code? Resend it"}
                </button>
              ) : (
                <p className="text-xs text-[#8C8071]">
                  Signed out?{" "}
                  <Link href="/sign-in" className="font-semibold text-[#C9A96E] hover:underline">
                    Sign in
                  </Link>{" "}
                  to resend the verification code.
                </p>
              )}
              <Link
                href="/"
                className="block text-center text-sm font-medium text-[#6A6053] transition hover:text-[#1A1A1A]"
              >
                Return home
              </Link>
            </div>
          </form>
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
