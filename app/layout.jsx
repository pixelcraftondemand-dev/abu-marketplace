import { Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import CookieConsentBanner from "@/components/CookieConsent";
import AbuChatBubble from "@/components/AbuChatBubble";
import "./globals.css";
import { cookies, headers } from 'next/headers'
import { getPreferredLocaleFromAcceptLanguage, supportedLocales, defaultLocale } from '@/lib/utils/locale'
import { NextIntlClientProvider } from 'next-intl'
import en from '@/locales/en/common.json'
import fr from '@/locales/fr/common.json'
import kri from '@/locales/kri/common.json'
import pt from '@/locales/pt/common.json'
import ha from '@/locales/ha/common.json'
import yo from '@/locales/yo/common.json'
import ig from '@/locales/ig/common.json'
import wo from '@/locales/wo/common.json'
import ff from '@/locales/ff/common.json'
import ak from '@/locales/ak/common.json'

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://abumarketplace.shop"),
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
  alternates: {
    canonical: "https://abumarketplace.shop",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://abumarketplace.shop",
    siteName: "ABU Marketplace",
    title: "ABU Marketplace — Trusted online shopping in Sierra Leone",
    description:
      "Discover electronics, fashion, home essentials, and everyday gadgets from a trusted marketplace built for modern shoppers.",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "ABU Marketplace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ABU Marketplace — Trusted online shopping in Sierra Leone",
    description:
      "Discover electronics, fashion, home essentials, and everyday gadgets from a trusted marketplace built for modern shoppers.",
    images: ["/og-image.svg"],
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
  themeColor: "#FAF8F5",
};

export default async function RootLayout({ children }) {
  let locale = defaultLocale
  let lang = 'en'
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
    fr,
    kri,
    pt,
    ha,
    yo,
    ig,
    wo,
    ff,
    ak,
  }[locale] || en

  return (
    <html lang={lang} className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta name="format-detection" content="telephone=no" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "ABU Marketplace",
              url: "https://abumarketplace.shop",
              logo: "https://abumarketplace.shop/favicon.ico",
              sameAs: [
                "https://www.instagram.com/abumarketplace",
                "https://www.facebook.com/abumarketplace",
                "https://www.linkedin.com/company/abumarketplace",
              ],
            }),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          appearance={{
            elements: {
              formButtonPrimary: "bg-[#1A1A1A] hover:bg-[#2D2D2D] text-white",
              footerActionLink: "text-[#C9A96E] hover:text-[#A88B52]",
              card: "bg-white border border-[#E8E2DB]",
              headerTitle: "text-[#1A1A1A]",
              headerSubtitle: "text-[#6B6560]",
              socialButtonsBlockButton: "border-[#E8E2DB] hover:bg-[#F5F0EB]",
              socialButtonsBlockButtonText: "text-[#1A1A1A]",
              formFieldLabel: "text-[#2D2D2D]",
              formFieldInput: "bg-[#FAF8F5] border-[#E8E2DB] text-[#1A1A1A] focus:border-[#C9A96E]",
              dividerLine: "bg-[#E8E2DB]",
              dividerText: "text-[#9B9590]",
              identityPreviewText: "text-[#1A1A1A]",
              identityPreviewEditButton: "text-[#C9A96E]",
              formFieldSuccessText: "text-green-600",
              formFieldErrorText: "text-red-600",
              alertText: "text-red-600",
              alert: "bg-red-50 border-red-100",
            },
            variables: {
              colorPrimary: "#1A1A1A",
              colorBackground: "#FFFFFF",
              colorText: "#1A1A1A",
              colorTextSecondary: "#6B6560",
              colorDanger: "#DC2626",
              borderRadius: "0px",
              fontFamily: "var(--font-inter), sans-serif",
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
                  color: "#1A1A1A",
                  border: "1px solid #E8E2DB",
                  borderRadius: "0px",
                  padding: "16px 20px",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "0.875rem",
                },
                success: {
                  iconTheme: { primary: "#C9A96E", secondary: "#FFFFFF" },
                },
                error: {
                  iconTheme: { primary: "#DC2626", secondary: "#FFFFFF" },
                },
              }}
            />
            {children}
            <CookieConsentBanner />
            <AbuChatBubble />
          </StoreProvider>
          </ClerkProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
