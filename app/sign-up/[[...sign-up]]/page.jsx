'use client'

import Image from "next/image";
import { SignUp } from "@clerk/nextjs";
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

export default function SignUpPage() {
    return (
        <main className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-2">
            {/* Left Section */}
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

            {/* Right Section */}
            <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-10">
                <div className="w-full max-w-md">
                    <div className="mb-10 lg:hidden">
                        <Image src={marketplaceLogo} alt="ABU Marketplace" priority className="w-40 rounded-xl" />
                    </div>
                    <div className="mb-8">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-lime-700">ABU Marketplace</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Create account</h1>
                        <p className="mt-2 text-sm leading-6 text-slate-500">Join our community and start shopping or selling today.</p>
                    </div>
                    <SignUp appearance={clerkAppearance} fallbackRedirectUrl="/" signInUrl="/sign-in" />
                </div>
            </section>
        </main>
    );
}

export default function SignUpPage() {
    const router = useRouter();
    const { data: session, isLoading } = useSession();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Redirect authenticated users to homepage
    useEffect(() => {
        if (!isLoading && session?.user) {
            router.push("/");
        }
    }, [session, isLoading, router]);

    const handleEmailSignUp = async (e) => {
        e.preventDefault();

        // Validate passwords match
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await signUp.email({
                email,
                password,
                name,
                callbackURL: "/",
            });

            if (response?.error) {
                toast.error(response.error.message || "Sign up failed");
            } else {
                toast.success("Account created successfully!");
                router.push("/");
            }
        } catch (error) {
            toast.error("Sign up failed. Please try again.");
            console.error("Sign up error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignUp = async () => {
        try {
            await signUp.social({
                provider: "google",
                callbackURL: "/",
            });
        } catch (error) {
            toast.error("Google sign up failed. Please try again.");
            console.error("Google sign up error:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-2">
            {/* Left Section */}
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

            {/* Right Section */}
            <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-10">
                <div className="w-full max-w-md">
                    <div className="mb-10 lg:hidden">
                        <Image src={marketplaceLogo} alt="ABU Marketplace" priority className="w-40 rounded-xl" />
                    </div>
                    <div className="mb-8">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-lime-700">ABU Marketplace</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Create account</h1>
                        <p className="mt-2 text-sm leading-6 text-slate-500">Join our community and start shopping or selling today.</p>
                    </div>

                    {/* Sign Up Form */}
                    <form onSubmit={handleEmailSignUp} className="space-y-4">
                        {/* Name Input */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-900">
                                Full Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="mt-2 block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 transition-colors"
                                placeholder="John Doe"
                            />
                        </div>

                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-900">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-2 block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-900">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-2 block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 transition-colors"
                                placeholder="••••••••"
                            />
                            <p className="mt-1 text-xs text-slate-500">Min 8 characters</p>
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-900">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="mt-2 block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Sign Up Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-lime-600 hover:bg-lime-700 disabled:bg-lime-400 text-white font-semibold py-2.5 rounded-lg transition-colors mt-6"
                        >
                            {isSubmitting ? "Creating account..." : "Create Account"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center">
                        <div className="flex-1 border-t border-slate-200" />
                        <span className="px-3 text-sm text-slate-500">or</span>
                        <div className="flex-1 border-t border-slate-200" />
                    </div>

                    {/* Google Sign Up */}
                    <button
                        onClick={handleGoogleSignUp}
                        className="w-full flex items-center justify-center gap-3 border border-slate-200 hover:bg-slate-50 py-2.5 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span className="text-slate-900 font-medium">Continue with Google</span>
                    </button>

                    {/* Sign In Link */}
                    <p className="mt-6 text-center text-sm text-slate-600">
                        Already have an account?{" "}
                        <Link href="/sign-in" className="font-semibold text-lime-700 hover:text-lime-800">
                            Sign in
                        </Link>
                    </p>
                </div>
            </section>
        </main>
    );
}
