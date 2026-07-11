import Image from "next/image";
import { SignIn } from "@clerk/nextjs";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";

const clerkAppearance = {
    variables: {
        colorPrimary: "#65b916",
        colorText: "#111827",
        colorTextSecondary: "#667085",
        colorBackground: "#ffffff",
        borderRadius: "0.875rem",
        fontFamily: "inherit",
    },
    elements: {
        card: "shadow-none border-0 p-0 bg-transparent w-full",
        headerTitle: "text-3xl font-semibold text-slate-950",
        headerSubtitle: "text-slate-500",
        socialButtonsBlockButton: "border-slate-200 hover:bg-lime-50 hover:border-lime-300",
        formButtonPrimary: "bg-lime-600 hover:bg-lime-700 shadow-none",
        formFieldInput: "border-slate-200 focus:border-lime-500 focus:ring-lime-500",
        footerActionLink: "text-lime-700 hover:text-lime-800",
    },
};

export default function SignInPage() {
    return (
        <main className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-2">
            <section className="relative hidden overflow-hidden bg-[#0b100b] px-10 py-12 lg:flex lg:flex-col lg:items-center lg:justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(119,219,26,0.2),transparent_36%),linear-gradient(135deg,#080b09_0%,#131a12_52%,#090b09_100%)]" />
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(151,239,58,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(151,239,58,0.05)_1px,transparent_1px)] [background-size:38px_38px]" />
                <div className="relative flex w-full max-w-xl flex-col items-center text-center">
                    <Image
                        src={marketplaceLogo}
                        alt="ABU Marketplace"
                        priority
                        className="w-full max-w-md rounded-3xl shadow-[0_0_80px_rgba(130,239,37,0.18)]"
                    />
                    <p className="mt-9 text-sm font-medium uppercase tracking-[0.36em] text-lime-300/90">
                        Shop smart. Live better.
                    </p>
                </div>
            </section>

            <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-10">
                <div className="w-full max-w-md">
                    <div className="mb-10 lg:hidden">
                        <Image src={marketplaceLogo} alt="ABU Marketplace" priority className="w-40 rounded-xl" />
                    </div>
                    <div className="mb-8">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-lime-700">ABU Marketplace</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Welcome back</h1>
                        <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to browse, shop, and manage your marketplace account.</p>
                    </div>
                    <SignIn appearance={clerkAppearance} fallbackRedirectUrl="/" signUpUrl="/sign-up" />
                </div>
            </section>
        </main>
    );
}
