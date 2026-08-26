"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { X, Mail, KeyRound, ArrowRight, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { getOrComputeFingerprint, getDeviceInfo } from "@/lib/deviceFingerprint";

const RESEND_COOLDOWN = 60; // seconds before resend is allowed

/**
 * Passwordless sign-in modal. Two-step flow:
 *   1. Enter email → "Send sign-in code"
 *   2. Enter 6-digit OTP → verified
 *
 * Also offers passkey sign-in when the browser supports WebAuthn.
 * After sign-in, checks device fingerprint and alerts on new devices.
 */
export default function SignInModal({ open, onClose }) {
  const router = useRouter();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { isSignedIn } = useUser();

  // ─── Modal state ───
  const [step, setStep] = useState("email"); // email | code | success | newDeviceWarning
  const [email, setEmail] = useState("");
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
      setStep("email");
      setEmail("");
      setCode("");
      setError("");
      setLoading(false);
      setResendTimer(0);
      setNewDeviceInfo(null);
    }
  }, [open]);

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
      if (!signInLoaded) {
        setError("Authentication is still loading. Please try again.");
        setLoading(false);
        return;
      }

      // Create or find the sign-in attempt for this email
      const result = await signIn.create({
        emailAddress: email.trim().toLowerCase(),
      });

      // Send the email verification code
      await signIn.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setStep("code");
      setCode("");
      setResendTimer(RESEND_COOLDOWN);
    } catch (err) {
      console.error("OTP send error:", err);
      if (err?.errors?.[0]?.message) {
        setError(err.errors[0].message);
      } else if (err?.message?.includes("not found")) {
        setError("No account found with this email. Try signing up first.");
      } else {
        setError("Could not send the code. Please try again.");
      }
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
      const result = await signIn.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === "complete") {
        // Sign-in successful — check device fingerprint
        const { isNew, deviceInfo } = await checkDevice();
        if (isNew) {
          // New device — show warning step (don't close modal)
          setNewDeviceInfo(deviceInfo);
          setStep("newDeviceWarning");
        } else {
          router.refresh();
          onClose();
        }
      } else {
        setError("Invalid code. Please check and try again.");
        setCode("");
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      if (err?.errors?.[0]?.code === "verification_expired") {
        setError("Code expired. Please request a new one.");
        setStep("email");
      } else if (err?.errors?.[0]?.message?.includes("incorrect")) {
        setError("Incorrect code. Please try again.");
        setCode("");
      } else {
        setError("Could not verify the code. Please try again.");
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
      await signIn.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setResendTimer(RESEND_COOLDOWN);
    } catch {
      setError("Could not resend the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Passkey sign-in ───
  const handlePasskeySignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const result = await signIn.authenticateWithPasskey();
      if (result.status === "complete") {
        const { isNew, deviceInfo } = await checkDevice();
        if (isNew) {
          setNewDeviceInfo(deviceInfo);
          setStep("newDeviceWarning");
        } else {
          router.refresh();
          onClose();
        }
      }
    } catch (err) {
      console.error("Passkey error:", err);
      if (err?.name === "NotAllowedError") {
        // User cancelled — don't show error
      } else {
        setError("Passkey sign-in failed. Try using email instead.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Check if passkeys are supported ───
  const [passkeySupported, setPasskeySupported] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
        (available) => setPasskeySupported(Boolean(available))
      );
    }
  }, []);

  // ─── Handle "new device warning" continue ───
  const handleNewDeviceContinue = () => {
    router.refresh();
    onClose();
  };

  // ─── Handle OTP input (auto-submit on 6 digits) ───
  const handleCodeChange = (value) => {
    // Only allow digits
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setError("");

    // Auto-submit when 6 digits entered
    if (digits.length === 6) {
      // Small delay to allow state update, then submit
      setTimeout(() => {
        document.getElementById("otp-form")?.requestSubmit();
      }, 50);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scale-in_0.2s_ease-out]"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all duration-200"
          aria-label="Close sign-in"
        >
          <X size={18} className="text-[var(--text-tertiary)]" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-2 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900">
            <span className="text-lg font-bold text-white tracking-wider">ABU</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Sign in or create your account
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Enter your email — no password needed.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 pt-4">
          {/* ─── Passkey button ─── */}
          {passkeySupported && step === "email" && (
            <>
              <button
                onClick={handlePasskeySignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
              >
                <KeyRound size={18} className="text-gray-400" />
                Sign in with passkey
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
                  or sign in with email
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </>
          )}

          {/* ─── Step: Email input ─── */}
          {step === "email" && (
            <form onSubmit={handleSendCode}>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
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
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-300 transition-all duration-200"
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
                    Send sign-in code
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">
                We&apos;ll email you a 6-digit code. No password needed.
              </p>
            </form>
          )}

          {/* ─── Step: OTP code entry ─── */}
          {step === "code" && (
            <form id="otp-form" onSubmit={handleVerifyCode}>
              <p className="text-sm text-[var(--text-secondary)] mb-1">
                Code sent to{" "}
                <span className="font-medium text-[var(--text-primary)]">{email}</span>
              </p>

              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2 mt-4">
                Enter 6-digit code
              </label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="000000"
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-2xl font-mono font-semibold tracking-[0.3em] text-gray-800 placeholder:text-gray-300 placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-300 transition-all duration-200"
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
                disabled={!code.trim() || loading || code.length < 6}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-gray-800 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Verify & sign in"
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
                you&apos;re all set. If not, please change your password
                immediately.
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
