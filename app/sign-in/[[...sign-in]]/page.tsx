"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { ShieldCheck, Lock, Truck } from "lucide-react";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";
import heroModelImage from "@/assets/hero_model_img.png";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLoaded || !signIn) return;
    if (!email) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        router.push("/");
      } else {
        await signIn.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setVerifying(true);
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "Unable to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLoaded || !signIn) return;
    if (!code) {
      setError("Enter the verification code sent to your email.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        router.push("/");
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    if (!isLoaded || !signIn) return;

    try {
      setLoading(true);
      await signIn.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (err) {
      setError(err.errors?.[0]?.message || "Unable to resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-slate-600">Loading authentication...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-[1700px] flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_24px_120px_rgba(15,23,42,0.12)] lg:flex-row">
        <section className="relative flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-6/12 lg:px-14 lg:py-16">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-100 to-transparent" />
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900">
              <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 shadow-sm">
                <Image src={marketplaceLogo} alt="ABU Marketplace" className="h-6 w-6" width={24} height={24} />
              </span>
              ABU Marketplace
            </Link>

            <div className="mt-10 max-w-xl animate-fade-up">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-500">Welcome back</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Sign in or verify with email OTP
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Use your email and password, then confirm with a one-time verification code for secure access.
              </p>
            </div>

            <div className="mt-10 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm animate-fade-up">
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 mb-4">
                  {error}
                </div>
              )}

              {verifying ? (
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Verification Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition"
                      maxLength={6}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Resend Code
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/sign-up" className="font-semibold text-amber-600 hover:text-amber-700">
                  Sign up
                </Link>
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3 animate-fade-up">
              <div className="flex items-start gap-3 rounded-3xl bg-slate-50 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Secure checkout</p>
                  <p className="text-sm text-slate-500">Your payment details stay protected.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-3xl bg-slate-50 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Lock size={20} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Buyer protection</p>
                  <p className="text-sm text-slate-500">Trusted sellers and guaranteed support.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-3xl bg-slate-50 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Truck size={20} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Fast order tracking</p>
                  <p className="text-sm text-slate-500">Track your marketplace orders in one place.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="relative hidden lg:flex lg:w-6/12 lg:flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900" />
          <div className="relative z-10 flex flex-1 flex-col justify-between p-10">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.35)]">
              <span className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">Premium experience</span>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white">Buy with confidence on ABU Marketplace.</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
                Discover curated products from trusted sellers with built-in protection and exceptional support.
              </p>
            </div>

            <div className="relative mt-10 overflow-hidden rounded-[32px] border border-white/10 bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.4)]">
              <Image src={heroModelImage} alt="ABU Marketplace hero" className="h-full w-full object-cover" fill />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
