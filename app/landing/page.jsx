'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import marketplaceLogo from '@/assets/abu-marketplace-logo.png';

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Redirect authenticated users to homepage
  useEffect(() => {
    if (isLoaded && user) {
      router.push('/');
    }
  }, [user, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src={marketplaceLogo}
              alt="ABU Marketplace"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-white">ABU Marketplace</span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/sign-in"
              className="px-6 py-2 text-lime-400 hover:text-lime-300 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-6 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Shop Smart.<br />
            <span className="text-lime-400">Live Better.</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            Discover the best deals from trusted sellers in one secure marketplace. Buy and sell with confidence.
          </p>
          <div className="flex gap-4">
            <Link
              href="/sign-up"
              className="px-8 py-3 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors font-semibold"
            >
              Get Started
            </Link>
            <Link
              href="/sign-in"
              className="px-8 py-3 border border-lime-500 text-lime-400 rounded-lg hover:bg-lime-500/10 transition-colors font-semibold"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(119,219,26,0.2),transparent_36%),linear-gradient(135deg,#080b09_0%,#131a12_52%,#090b09_100%)] rounded-2xl" />
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-lime-600/20 to-slate-900/50 p-8">
            <Image
              src={marketplaceLogo}
              alt="ABU Marketplace"
              priority
              className="w-full rounded-xl shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">Why Choose ABU Marketplace?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-lime-600/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Secure Shopping</h3>
            <p className="text-slate-400">
              Your transactions are protected with industry-leading security standards and buyer protection.
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-lime-600/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Fast Deals</h3>
            <p className="text-slate-400">
              Access flash deals and exclusive offers from verified sellers in real-time.
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-lime-600/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Trusted Community</h3>
            <p className="text-slate-400">
              Join thousands of satisfied buyers and sellers in our trusted marketplace community.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 mb-20">
        <div className="bg-gradient-to-r from-lime-600 to-lime-500 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to Start Shopping?</h2>
          <p className="text-slate-800 mb-8 text-lg">
            Create your account now and discover amazing deals.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-8 py-3 bg-slate-900 text-lime-400 rounded-lg hover:bg-slate-800 transition-colors font-semibold"
          >
            Sign Up Free
          </Link>
        </div>
      </section>
    </main>
  );
}
