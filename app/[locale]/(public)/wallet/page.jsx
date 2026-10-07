import Link from "next/link";

export default function WalletPage() {
  return (
    <main className="flex min-h-[65vh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">
          Wallet services are temporarily unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          You can still place orders using cash on delivery.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Browse products
        </Link>
      </div>
    </main>
  );
}
