"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { X, Mail, ArrowRight, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { getOrComputeFingerprint, getDeviceInfo } from "@/lib/deviceFingerprint";

const RESEND_COOLDOWN = 60; // seconds before resend is allowed

/**
 * Passwordless sign-in with social providers and email verification codes.
 * After sign-in, checks device fingerprint and alerts on new devices.
 */
export default function SignInModal({
  open,
  onClose,
  standalone = false,
  initialStep = "email",
}) {
  const router = useRouter();
  const { signIn } = useSignIn();
  const { isSignedIn } = useUser();

  // ─── Modal state ───
  const [step, setStep] = useState(initialStep); // email | code | newDeviceWarning
  const [email, setEmail] = useState("");
  const [signUpMode, setSignUpMode] = useState(false);
  const [codeFlow, setCodeFlow] = useState("signIn");
  const [code, setCode] = useState(""); // 6-char OTP input
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [newDeviceInfo, setNewDeviceInfo] = useState(null); // device info if new device detected

  const emailInputRef = useRef(null);
  const codeInputRef = useRef(null);
  const modalRef = useRef(null);

  // ─── Focus management ───
  useEffect(() => {
    if (!open) return;
    if (step === "email") {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    } else if (step === "code") {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [open, step]);

  // ─── Reset on open/close ───
  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setEmail("");
      setSignUpMode(false);
      setCodeFlow("signIn");
      setCode("");
      setError("");
      setLoading(false);
      setResendTimer(0);
      setNewDeviceInfo(null);
    }
  }, [open, initialStep]);

  // ─── If already signed in, close modal ───
  useEffect(() => {
    if (isSignedIn && open) {
      onClose();
    }
  }, [isSignedIn, open, onClose]);

  // ─── Resend cooldown timer ───
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // ─── Escape key closes modal ───
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // ─── Backdrop click closes modal ───
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  // ─── Email validation ───
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // ─── Device check after successful sign-in ───
  // Returns { isNew: boolean, deviceInfo: object|null } so callers can decide
  // whether to close the modal immediately or show the new-device warning.
  // (React state setters are async, so we can't rely on newDeviceInfo after
  // calling setNewDeviceInfo — return the result directly instead.)
  const checkDevice = useCallback(async () => {
    try {
      const fingerprint = await getOrComputeFingerprint();
      const deviceInfo = getDeviceInfo();
      if (!fingerprint) return { isNew: false, deviceInfo: null };

      const res = await fetch("/api/auth/device-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint, deviceInfo }),
      });

      const data = await res.json();
      if (data.known === false) {
        return { isNew: true, deviceInfo };
      }
      return { isNew: false, deviceInfo: null };
    } catch (err) {
      // Device check is best-effort — don't block sign-in if it fails
      console.warn("Device check failed:", err);
      return { isNew: false, deviceInfo: null };
    }
  }, []);

  // ─── Step 1: Request OTP ───
  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!isValidEmail || loading) return;

    setLoading(true);
    setError("");

    try {
      const emailAddress = email.trim().toLowerCase();
      const response = await fetch("/api/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailAddress,
          intent: signUpMode ? "signUp" : "signIn",
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const sendError = new Error(result.error || "Could not send the code.");
        sendError.code = result.code;
        throw sendError;
      }

      setCodeFlow(signUpMode ? "signUp" : "signIn");
      setStep("code");
      setCode("");
      setResendTimer(RESEND_COOLDOWN);
    } catch (err) {
      console.error("OTP send error:", err);
      setError(err?.message || "Could not send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP ───
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          intent: codeFlow,
          code: code.trim().toUpperCase(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const verifyError = new Error(result.error || "Could not verify the code.");
        verifyError.code = result.code;
        throw verifyError;
      }

      const { error: ticketError } = await signIn.create({
        strategy: "ticket",
        ticket: result.ticket,
      });
      if (ticketError) throw ticketError;
      if (signIn.status !== "complete") {
        throw new Error("More verification is required to finish signing in.");
      }
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;

      const { isNew, deviceInfo } = await checkDevice();
      if (isNew) {
        setNewDeviceInfo(deviceInfo);
        setStep("newDeviceWarning");
      } else {
        router.refresh();
        onClose();
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      const errorCode = err?.errors?.[0]?.code || err?.code;
      const errorMessage = err?.errors?.[0]?.message || err?.message;
      if (errorCode === "expired" || errorCode === "verification_expired") {
        setError("Code expired. Please request a new one.");
        setStep("email");
      } else if (errorCode === "account_not_found" || errorCode === "account_exists") {
        setSignUpMode(errorCode === "account_not_found");
        setStep("email");
        setCode("");
        setError(errorMessage || "Choose the matching sign-in option and request a new code.");
      } else if (errorMessage?.toLowerCase().includes("incorrect")) {
        setError("Incorrect code. Please try again.");
        setCode("");
      } else {
        setError(errorMessage || "Could not verify the code. Please try again.");
        setCode("");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ───
  const handleResend = async () => {
    if (resendTimer > 0 || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          intent: codeFlow,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not resend the code.");
      }
      setResendTimer(RESEND_COOLDOWN);
    } catch (err) {
      console.error("OTP resend error:", err);
      setError("Could not resend the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (strategy) => {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const { error } = await signIn.sso({
        strategy,
        redirectUrl: "/",
        redirectCallbackUrl: "/sso-callback",
      });
      if (error) throw error;
    } catch (err) {
      console.error("Social sign-in error:", err);
      setError("Could not start social sign-in. Please try again.");
      setLoading(false);
    }
  };

  // ─── Handle "new device warning" continue ───
  const handleNewDeviceContinue = () => {
    router.refresh();
    onClose();
  };

  // ─── Handle OTP input (auto-submit on six characters) ───
  const handleCodeChange = (value) => {
    const normalized = value.toUpperCase().replace(/[^A-HJ-NP-Z0-9]/g, "").slice(0, 6);
    setCode(normalized);
    setError("");

    // Auto-submit when the six-character code is entered.
    if (normalized.length === 6) {
      // Small delay to allow state update, then submit
      setTimeout(() => {
        document.getElementById("otp-form")?.requestSubmit();
      }, 50);
    }
  };

  if (!open) return null;

  return (
    <div
      className={
        standalone
          ? "w-full max-w-[420px]"
          : "fixed inset-0 z-[100] flex items-center justify-center p-4"
      }
      onClick={standalone ? undefined : handleBackdropClick}
      role={standalone ? undefined : "dialog"}
      aria-modal={standalone ? undefined : "true"}
      aria-label="Sign in"
    >
      {/* Backdrop */}
      {!standalone && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      )}

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden ${
          standalone
            ? "border border-gray-100 shadow-xl"
            : "max-w-[420px] animate-[scale-in_0.2s_ease-out]"
        }`}
      >
        {/* Close button */}
        {!standalone && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all duration-200"
            aria-label="Close sign-in"
          >
            <X size={18} className="text-[var(--text-tertiary)]" />
          </button>
        )}

        {/* Header */}
        <div className="px-8 pt-8 pb-2 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900">
            <span className="text-lg font-bold text-white tracking-wider">ABU</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {standalone ? "Welcome to ABU" : "Sign in or create an account"}
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">
            {standalone
          ? "Choose a social account or get a passwordless code by email."
          : "Use a social account or a passwordless email code."}
          </p>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 pt-4">
          {/* ─── Social sign-in ─── */}
          {step === "email" && (
            <div className="space-y-2.5">
              {[
                { strategy: "oauth_google", label: "Continue with Google", mark: "G" },
                { strategy: "oauth_apple", label: "Continue with Apple", mark: "A" },
                { strategy: "oauth_facebook", label: "Continue with Facebook", mark: "f" },
              ].map(({ strategy, label, mark }) => (
                <button
                  key={strategy}
                  type="button"
                  onClick={() => handleSocialSignIn(strategy)}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden="true" className="w-5 text-center text-base font-bold text-gray-800">
                    {loading ? <Loader2 size={16} className="mx-auto animate-spin" /> : mark}
                  </span>
                  {label}
                </button>
              ))}

              <p className="text-center text-xs text-gray-400">
                Social providers may ask for that account&apos;s password. Use email code for passwordless ABU sign-in.
              </p>

              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
                  or use email
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
            </div>
          )}

          {/* ─── Step: Email one-time code ─── */}
          {step === "email" && (
            <form onSubmit={handleSendCode}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-300 transition-all duration-200"
                />
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!isValidEmail || loading}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-gray-800 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    {signUpMode ? "Create account with code" : "Send sign-in code"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">
                We&apos;ll email you a 6-character code with one letter. No ABU password needed.
              </p>
              <p className="mt-3 text-center text-sm text-gray-500">
                {signUpMode ? "Already have an account?" : "New to ABU?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSignUpMode((value) => !value);
                    setError("");
                  }}
                  className="font-semibold text-[var(--color-primary)] hover:underline"
                >
                  {signUpMode ? "Sign in" : "Create an account"}
                </button>
              </p>
            </form>
          )}

          {/* ─── Step: OTP code entry ─── */}
          {step === "code" && (
            <form id="otp-form" onSubmit={handleVerifyCode}>
              <p className="text-sm text-gray-600 mb-1">
                Code sent to{" "}
                <span className="font-semibold text-gray-900">{email}</span>
              </p>

              <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
                Enter your 6-character code
              </label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="12345A"
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-2xl font-mono font-semibold tracking-[0.3em] text-gray-800 placeholder:text-gray-300 placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-300 transition-all duration-200"
                maxLength={6}
              />

              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!code.trim() || loading || code.length !== 6}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-gray-800 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  codeFlow === "signUp" ? "Verify & create account" : "Verify & sign in"
                )}
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">
                {resendTimer > 0 ? (
                  <span>
                    Resend code in{" "}
                    <span className="font-medium text-gray-600">
                      {resendTimer}s
                    </span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-[var(--color-primary)] hover:underline font-medium"
                  >
                    Resend code
                  </button>
                )}
              </p>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError("");
                  setCode("");
                }}
                className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Use a different email
              </button>
            </form>
          )}

          {/* ─── Step: New device warning ─── */}
          {step === "newDeviceWarning" && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
                <ShieldCheck size={24} className="text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                New device detected
              </h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                We&apos;ve sent a security alert to your email. If this was you,
                you&apos;re all set. If not, contact support to secure your account.
              </p>
              {newDeviceInfo && (
                <div className="bg-gray-50 rounded-xl p-4 text-left text-xs text-gray-500 space-y-1 mb-6 border border-gray-100">
                  <p>
                    <span className="font-medium text-gray-700">Platform:</span>{" "}
                    {newDeviceInfo.platform}
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Screen:</span>{" "}
                    {newDeviceInfo.screen}
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Timezone:</span>{" "}
                    {newDeviceInfo.timezone}
                  </p>
                </div>
              )}
              <button
                onClick={handleNewDeviceContinue}
                className="w-full py-3.5 bg-gray-900 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-gray-800 hover:shadow-lg"
              >
                Continue to ABU Marketplace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
