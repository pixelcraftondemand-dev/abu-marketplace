import { Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import CookieConsentBanner from "@/components/CookieConsent";
import "./globals.css";

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
  title: {
    default: "ABU Marketplace — Curated Luxury",
    template: "%s | ABU Marketplace",
  },
  description: "Discover curated luxury products from the world's finest artisans and brands. Authentic. Exclusive. Yours.",
  keywords: ["luxury marketplace", "premium products", "curated shopping", "artisan goods", "exclusive deals"],
  authors: [{ name: "ABU Marketplace" }],
  creator: "ABU Marketplace",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://abumarketplace.shop",
    siteName: "ABU Marketplace",
    title: "ABU Marketplace — Curated Luxury",
    description: "Discover curated luxury products from the world's finest artisans.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "ABU Marketplace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ABU Marketplace — Curated Luxury",
    description: "Discover curated luxury products from the world's finest artisans.",
    images: ["/og-image.jpg"],
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ClerkProvider
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
          </StoreProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
