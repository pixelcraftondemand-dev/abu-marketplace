"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";

export default function BrandLogo({
  href = "/",
  className = "",
  showText = true,
  brandClassName = "text-gray-900",
  taglineClassName = "text-gray-500",
  compact = false,
  noLink = false,
}) {
  const [imageError, setImageError] = useState(false);

  const logoImage = (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100 ${compact ? "h-9 w-9" : "h-11 w-11"}`}
    >
      {!imageError ? (
        <Image
          src={marketplaceLogo}
          alt=""
          fill
          priority
          sizes={compact ? "(max-width: 768px) 36px, 40px" : "(max-width: 768px) 44px, 48px"}
          className="object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-900 text-sm font-bold text-white rounded-xl">
          ABU
        </div>
      )}
    </div>
  );

  const textBlock = showText && (
    <div className="min-w-0">
      <span className={`block text-lg font-bold tracking-tight leading-none ${brandClassName}`}>
        ABU
      </span>
      <span className={`mt-0.5 block text-[9px] uppercase tracking-[0.15em] font-semibold leading-none ${taglineClassName}`}>
        Marketplace
      </span>
    </div>
  );

  const inner = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {logoImage}
      {textBlock}
    </div>
  );

  if (noLink) return inner;

  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      {logoImage}
      {textBlock}
    </Link>
  );
}
