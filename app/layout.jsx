import { Outfit, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import CookieConsentBanner from "@/components/CookieConsent";
import "./globals.css";

const outfit = Outfit({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});

export const metadata = {
  title: {
    default: "ABU Marketplace — Premium Shopping Experience",
    template: "%s | ABU Marketplace",
  },
  description: "Discover premium products from trusted sellers. Secure payments, authentic products, and a seamless shopping experience at ABU Marketplace.",
  keywords: ["ecommerce", "marketplace", "premium products", "online shopping", "secure payments"],
  authors: [{ name: "ABU Marketplace" }],
  creator: "ABU Marketplace",
  publisher: "ABU Marketplace",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://abumarketplace.shop",
    siteName: "ABU Marketplace",
    title: "ABU Marketplace — Premium Shopping Experience",
    description: "Discover premium products from trusted sellers. Secure payments, authentic products.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ABU Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ABU Marketplace — Premium Shopping Experience",
    description: "Discover premium products from trusted sellers.",
    images: ["/og-image.jpg"],
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://abumarketplace.shop",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "msapplication-TileColor": "#0B0F19",
    "theme-color": "#0B0F19",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B0F19",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Security Headers via meta (supplement to middleware) */}
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.abumarketplace.shop https://*.clerk.accounts.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.clerk.accounts.dev https://api.abumarketplace.shop wss://*.clerk.accounts.dev; frame-src 'self' https://*.clerk.accounts.dev; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=(self)" />
      </head>
      <body className={`${outfit.className} antialiased ambient-bg`}>
        <ClerkProvider
          appearance={{
            elements: {
              formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-black",
              footerActionLink: "text-amber-500 hover:text-amber-400",
              card: "bg-[#111827] border border-white/[0.06]",
              headerTitle: "text-white",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton: "border-white/[0.06] hover:bg-white/[0.05]",
              socialButtonsBlockButtonText: "text-white",
              formFieldLabel: "text-slate-300",
              formFieldInput: "bg-[#0B0F19] border-white/[0.08] text-white focus:border-amber-500",
              dividerLine: "bg-white/[0.08]",
              dividerText: "text-slate-500",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-amber-500",
              formFieldSuccessText: "text-green-400",
              formFieldErrorText: "text-red-400",
              alertText: "text-red-400",
              alert: "bg-red-500/10 border-red-500/20",
            },
            variables: {
              colorPrimary: "#F59E0B",
              colorBackground: "#0B0F19",
              colorText: "#F3F4F6",
              colorTextSecondary: "#9CA3AF",
              colorDanger: "#EF4444",
              borderRadius: "0.75rem",
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
                  background: "#111827",
                  color: "#F3F4F6",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "16px",
                },
                success: {
                  iconTheme: {
                    primary: "#10B981",
                    secondary: "#0B0F19",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#EF4444",
                    secondary: "#0B0F19",
                  },
                },
              }}
            />
            {children}
            <CookieConsentBanner />
          </StoreProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}