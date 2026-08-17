"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ShoppingBag, X } from "lucide-react";
import { onAddedToCart } from "@/lib/cartEvents";
import CurrencyAmount from "@/components/CurrencyAmount";
import { useTranslation } from "@/lib/i18n";

const AUTO_DISMISS_MS = 4000;

/**
 * Shein-style slide-up confirmation shown when an item is added to the cart.
 * Mounted once in the root layout; fires via lib/cartEvents (no prop drilling).
 */
export default function AddedToCartSheet() {
  const { t } = useTranslation();
  const [product, setProduct] = useState(null);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dismiss = () => {
    setLeaving(true);
    // Wait for the slide-out transition, then reset so the next add re-mounts.
    setTimeout(() => {
      setLeaving(false);
      setVisible(false);
      setProduct(null);
    }, 250);
  };

  useEffect(() => {
    let autoTimer = null;
    const unsubscribe = onAddedToCart((added) => {
      setProduct(added);
      setVisible(true);
      setLeaving(false);
      if (autoTimer) clearTimeout(autoTimer);
      autoTimer = setTimeout(dismiss, AUTO_DISMISS_MS);
    });
    return () => {
      unsubscribe();
      if (autoTimer) clearTimeout(autoTimer);
    };
  }, []);

  if (!visible || !product) return null;

  const image = Array.isArray(product.images) && product.images.length
    ? product.images[0]
    : product.image;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-4 sm:justify-end sm:pr-6">
      <div
        role="status"
        aria-live="polite"
        className={`w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.25)] transition-transform duration-300 ${
          leaving ? "translate-y-[120%]" : "translate-y-0"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{t("product.addedToCartTitle")}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {image && (
                  <Image src={image} alt={product.name} width={56} height={56} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                <p className="text-sm font-semibold text-[#C9A96E]">
                  <CurrencyAmount amount={product.price} />
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("product.dismiss")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href="/cart"
            onClick={dismiss}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#C9A96E] px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#b18d45]"
          >
            <ShoppingBag size={15} />
            {t("product.viewCart")}
          </Link>
          <button
            onClick={dismiss}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t("product.continueShopping")}
          </button>
        </div>
      </div>
    </div>
  );
}
