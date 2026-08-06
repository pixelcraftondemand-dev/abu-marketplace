"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";

export default function BrandLogo({
  href = "/",
  className = "",
  showText = true,
  brandClassName = "text-[#1A1A1A]",
  taglineClassName = "text-[#8f7d61]",
  compact = false,
}) {
  const [imageError, setImageError] = useState(false);

  const content = (
    <>
      <div
        className={`relative shrink-0 overflow-hidden rounded-full bg-white/80 shadow-sm ring-1 ring-[#d8c4a2] ${compact ? "h-9 w-9" : "h-11 w-11"}`}
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
          <div className="flex h-full w-full items-center justify-center bg-[#1A1A1A] text-sm font-semibold text-white">
            ABU
          </div>
        )}
      </div>

      {showText && (
        <div className="min-w-0">
          <span className={`block font-display text-[1.35rem] font-semibold tracking-[0.2em] leading-none ${brandClassName}`}>
            ABU
          </span>
          <span className={`mt-0.5 block text-[8.5px] uppercase tracking-[0.3em] font-semibold leading-none ${taglineClassName}`}>
            Marketplace
          </span>
        </div>
      )}
    </>
  );

  return (
    <Link href={href} className={`flex items-center gap-2.5 group ${className}`}>
      {content}
    </Link>
  );
}
