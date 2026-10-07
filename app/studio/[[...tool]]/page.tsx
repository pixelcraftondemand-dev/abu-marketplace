"use client";

import dynamic from "next/dynamic";

const StudioClient = dynamic(() => import("../StudioClient"), {
  ssr: false,
  loading: () => (
    <p className="p-6 text-sm text-slate-500">Loading studio...</p>
  ),
});

export default function StudioPage() {
  return <StudioClient />;
}
