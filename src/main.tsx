import { ClerkProvider } from '@clerk/react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = createRoot(document.getElementById('root')!);

if (!clerkPublishableKey) {
  root.render(
    <main className="min-h-screen grid place-items-center bg-slate-950 p-6 text-center text-white">
      <p role="alert">Set VITE_CLERK_PUBLISHABLE_KEY to enable sign-in.</p>
    </main>
  );
} else {
  root.render(
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <App />
    </ClerkProvider>
  );
}
