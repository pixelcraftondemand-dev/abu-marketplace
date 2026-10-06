import { Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import CookieConsentBanner from "@/components/CookieConsent";
import AbuChatBubble from "@/components/AbuChatBubble";
import WhatsAppBubble from "@/components/WhatsAppBubble";
import AddedToCartSheet from "@/components/AddedToCartSheet";
import "./globals.css";
import { cookies, headers } from 'next/headers'
import { THEME_INIT_SCRIPT } from '@/components/ThemeToggle'
import { getPreferredLocaleFromAcceptLanguage, supportedLocales, defaultLocale } from '@/lib/utils/locale'
import { NextIntlClientProvider } from 'next-intl'
import en from '@/locales/en/common.json'
import kri from '@/locales/kri/common.json'

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata = {
  // Vercel 307-redirects the apex domain to www — make www the canonical base.
  metadataBase: new URL("https://www.abumarketplace.shop"),
  title: {
    default: "ABU Marketplace — Trusted online shopping in Sierra Leone",
    template: "%s | ABU Marketplace",
  },
  description:
    "ABU Marketplace is a trusted online marketplace for electronics, fashion, home essentials, and everyday gadgets in Sierra Leone and beyond.",
  keywords: [
    "ABU Marketplace",
    "online marketplace Sierra Leone",
    "electronics Sierra Leone",
    "fashion marketplace",
    "gadget shopping",
    "trusted online store",
  ],
  authors: [{ name: "ABU Marketplace" }],
  creator: "ABU Marketplace",
  applicationName: "ABU Marketplace",
  // No global canonical here — pages set their own (locale-aware) canonical in
  // generateMetadata. A static root canonical made every page canonicalize to
  // the homepage, telling Google to deindex everything else.
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.abumarketplace.shop",
    siteName: "ABU Marketplace",
    title: "ABU Marketplace — Trusted online shopping in Sierra Leone",
    description:
      "Discover electronics, fashion, home essentials, and everyday gadgets from a trusted marketplace built for modern shoppers.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "ABU Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ABU Marketplace — Trusted online shopping in Sierra Leone",
    description:
      "Discover electronics, fashion, home essentials, and everyday gadgets from a trusted marketplace built for modern shoppers.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
};

export default async function RootLayout({ children }) {
  let locale = defaultLocale
  let lang = 'en'
  let clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_TEST_PUBLISHABLE_KEY || "pk_test_00000000000000000000000000000000"

  try {
    const cookieStore = await cookies()
    const headerStore = await headers()
    const cookieLang = cookieStore.get('marketplaceLocale')?.value
    const preferred = getPreferredLocaleFromAcceptLanguage(headerStore.get('accept-language'))
    const localeCode = cookieLang || preferred
    locale = supportedLocales.includes(localeCode) ? localeCode : defaultLocale
    lang = locale
  } catch (e) {
    locale = defaultLocale
    lang = defaultLocale
  }

  const messages = {
    en,
    kri,
  }[locale] || en

  return (
    <html lang={lang} className={outfit.variable} suppressHydrationWarning>
      <head>
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta name="format-detection" content="telephone=no" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* JSON-LD is a data block (application/ld+json), never executed, so it
            needs no CSP nonce — and giving it one would desync the server HTML
            (nonce from x-nonce) from client hydration (next/headers unavailable
            on the client), which React flags as a hydration mismatch. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "ABU Marketplace",
              url: "https://www.abumarketplace.shop",
              logo: "https://www.abumarketplace.shop/og-image.png",
              sameAs: [
                "https://www.instagram.com/abumarketplace",
                "https://www.facebook.com/abumarketplace",
                "https://www.linkedin.com/company/abumarketplace",
              ],
            }),
          }}
        />
      </head>
      <body className={`${outfit.className} antialiased text-gray-700`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClerkProvider
            dynamic
            publishableKey={clerkPublishableKey}
            appearance={{
              elements: {
                formButtonPrimary: "bg-orange-600 hover:bg-orange-700 text-white",
                footerActionLink: "text-orange-600 hover:text-orange-700",
                card: "bg-white border border-gray-200",
                headerTitle: "text-gray-900",
                headerSubtitle: "text-gray-500",
                socialButtonsBlockButton: "border-gray-200 hover:bg-gray-50",
                socialButtonsBlockButtonText: "text-gray-900",
                formFieldLabel: "text-gray-800",
                formFieldInput: "bg-white border-gray-200 text-gray-900 focus:border-orange-500",
                dividerLine: "bg-gray-200",
                dividerText: "text-gray-400",
                identityPreviewText: "text-gray-900",
                identityPreviewEditButton: "text-orange-600",
                formFieldSuccessText: "text-green-600",
                formFieldErrorText: "text-red-600",
                alertText: "text-red-600",
                alert: "bg-red-50 border-red-100",
              },
              variables: {
                colorPrimary: "#EA580C",
                colorBackground: "#FFFFFF",
                colorText: "#111827",
                colorTextSecondary: "#6B7280",
                colorDanger: "#DC2626",
                borderRadius: "0.5rem",
                fontFamily: "var(--font-outfit), sans-serif",
              },
            }}
          >
            <StoreProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "#FFFFFF",
                    color: "#111827",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                    padding: "16px 20px",
                    fontFamily: "var(--font-outfit), sans-serif",
                    fontSize: "0.875rem",
                  },
                  success: {
                    iconTheme: { primary: "#EA580C", secondary: "#FFFFFF" },
                  },
                  error: {
                    iconTheme: { primary: "#DC2626", secondary: "#FFFFFF" },
                  },
                }}
              />
              {children}
              <CookieConsentBanner />
              <AbuChatBubble />
              <WhatsAppBubble />
              <AddedToCartSheet />
            </StoreProvider>
          </ClerkProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
