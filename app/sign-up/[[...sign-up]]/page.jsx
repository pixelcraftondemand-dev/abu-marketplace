"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Lock,
  Check,
  FileText,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToAge, setAgreedToAge] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");

  const validatePassword = (pass) => {
    const checks = {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    };
    return checks;
  };

  const passwordChecks = validatePassword(password);
  const allPasswordChecks = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLoaded) return;

    // Validation
    if (!agreedToTerms || !agreedToPrivacy || !agreedToAge) {
      setError("You must agree to all terms to create an account.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!allPasswordChecks) {
      setError("Please meet all password requirements.");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else if (result.status === "missing_requirements") {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setVerifying(true);
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-slate-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-amber-500/20 group-hover:ring-amber-500/40 transition-all">
              <Image
                src={marketplaceLogo}
                alt="ABU Marketplace"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              ABU<span className="text-amber-500">.</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-6 mb-2">
            {verifying ? "Verify Your Email" : "Create Your Account"}
          </h1>
          <p className="text-slate-400">
            {verifying
              ? "Enter the verification code sent to your email"
              : "Join thousands of smart shoppers today"}
          </p>
        </div>

        {/* Form */}
        <div className="p-6 rounded-2xl bg-[#111827]/60 border border-white/[0.06] backdrop-blur-sm">
          {error && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {verifying ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3 bg-[#0B0F19] border border-white/[0.08] rounded-xl text-white placeholder:text-slate-600 outline-none focus:border-amber-500/30 transition text-center text-lg tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    Verify Email
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-[#0B0F19] border border-white/[0.08] rounded-xl text-white placeholder:text-slate-600 outline-none focus:border-amber-500/30 transition"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-4 py-3 pr-12 bg-[#0B0F19] border border-white/[0.08] rounded-xl text-white placeholder:text-slate-600 outline-none focus:border-amber-500/30 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password strength indicators */}
                <div className="mt-3 space-y-2">
                  {Object.entries(passwordChecks).map(([key, valid]) => (
                    <div
                      key={key}
                      className={`flex items-center gap-2 text-xs transition ${
                        valid ? "text-green-400" : "text-slate-600"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          valid
                            ? "bg-green-500/10"
                            : "bg-slate-800"
                        }`}
                      >
                        {valid && <Check size={10} />}
                      </div>
                      {key === "length" && "At least 8 characters"}
                      {key === "uppercase" && "One uppercase letter"}
                      {key === "lowercase" && "One lowercase letter"}
                      {key === "number" && "One number"}
                      {key === "special" && "One special character"}
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full px-4 py-3 pr-12 bg-[#0B0F19] border border-white/[0.08] rounded-xl text-white placeholder:text-slate-600 outline-none focus:border-amber-500/30 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Terms Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      agreedToTerms
                        ? "bg-amber-500 border-amber-500"
                        : "border-slate-600 group-hover:border-amber-500/50"
                    }`}
                    onClick={() => setAgreedToTerms(!agreedToTerms)}
                  >
                    {agreedToTerms && <Check size={12} className="text-black" />}
                  </div>
                  <span className="text-sm text-slate-400">
                    I agree to the{" "}
                    <Link
                      href="/terms-and-conditions"
                      className="text-amber-500 hover:text-amber-400 underline"
                      target="_blank"
                    >
                      Terms and Conditions
                    </Link>{" "}
                    and understand that this is a legally binding agreement.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      agreedToPrivacy
                        ? "bg-amber-500 border-amber-500"
                        : "border-slate-600 group-hover:border-amber-500/50"
                    }`}
                    onClick={() => setAgreedToPrivacy(!agreedToPrivacy)}
                  >
                    {agreedToPrivacy && (
                      <Check size={12} className="text-black" />
                    )}
                  </div>
                  <span className="text-sm text-slate-400">
                    I agree to the{" "}
                    <Link
                      href="/privacy-policy"
                      className="text-amber-500 hover:text-amber-400 underline"
                      target="_blank"
                    >
                      Privacy Policy
                    </Link>{" "}
                    and consent to the collection and processing of my personal
                    data as described therein.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      agreedToAge
                        ? "bg-amber-500 border-amber-500"
                        : "border-slate-600 group-hover:border-amber-500/50"
                    }`}
                    onClick={() => setAgreedToAge(!agreedToAge)}
                  >
                    {agreedToAge && <Check size={12} className="text-black" />}
                  </div>
                  <span className="text-sm text-slate-400">
                    I confirm that I am at least 18 years of age and have the
                    legal capacity to enter into binding contracts.
                  </span>
                </label>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                By creating an account, you agree to our{' '}
                <Link href="/terms-and-conditions" className="text-amber-500 hover:text-amber-400 underline" target="_blank">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy-policy" className="text-amber-500 hover:text-amber-400 underline" target="_blank">
                  Privacy Policy
                </Link>.
              </p>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <Lock size={14} className="text-amber-500 shrink-0" />
                <span className="text-xs text-slate-500">
                  Your data is encrypted with 256-bit SSL. We never store your
                  password in plain text.
                </span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  loading ||
                  !agreedToTerms ||
                  !agreedToPrivacy ||
                  !agreedToAge ||
                  !allPasswordChecks
                }
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-slate-500">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Social Sign Up */}
          <div className="space-y-3">
            <button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-white rounded-xl transition">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-amber-500 hover:text-amber-400 font-medium transition"
          >
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}