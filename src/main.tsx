import { ClerkProvider } from '@clerk/react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Injected by vite.config.ts: the development instance off production, the live
// instance in production. Falls back to the plain env var if the tag is missing.
const clerkPublishableKey =
  document.querySelector<HTMLMetaElement>('meta[name="clerk-publishable-key"]')?.content ||
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = createRoot(document.getElementById('root')!);

if (!clerkPublishableKey) {
  root.render(
    <main className="min-h-screen grid place-items-center bg-slate-950 p-6 text-center text-white">
      <p role="alert">Set VITE_CLERK_PUBLISHABLE_KEY (or CLERK_DEV_PUBLISHABLE_KEY) to enable sign-in.</p>
    </main>
  );
} else {
  // The Clerk dashboard points its sign-in/sign-up URLs at accounts.abumarketplace.shop
  // and its post-auth redirect at the apex domain, which Vercel forwards to www. Every
  // one of those hops costs the session cookie its host, so the OAuth handshake retries
  // forever after an account is chosen. Keep each step inside this app on the origin the
  // visitor is already on.
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;

  root.render(
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      signInUrl="/login"
      signUpUrl="/register"
      signInFallbackRedirectUrl={appOrigin}
      signUpFallbackRedirectUrl={appOrigin}
    >
      <App />
    </ClerkProvider>
  );
}
