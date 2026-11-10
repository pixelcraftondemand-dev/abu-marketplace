import { ClerkProvider, useAuth, useUser } from '@clerk/react';
import { useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { setClerkTokenProvider } from './services/api';
import type { UserProfile } from './types';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ClerkApp() {
  const { getToken, isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    setClerkTokenProvider(isSignedIn ? getToken : null);
    return () => setClerkTokenProvider(null);
  }, [getToken, isSignedIn]);

  const clerkUser: UserProfile | null = useMemo(() => user
    ? {
        id: user.id,
        name: user.fullName || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Shopper',
        email: user.primaryEmailAddress?.emailAddress,
        provider: 'clerk',
        isVerified: true,
        avatar: user.imageUrl,
        role: 'buyer',
        joinedAt: user.createdAt?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) || '',
      }
    : null, [user]);

  return (
    <App
      clerkEnabled
      clerkLoaded={isLoaded}
      clerkUser={clerkUser}
      onClerkSignOut={signOut}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  clerkPublishableKey ? (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ClerkApp />
    </ClerkProvider>
  ) : (
    <App />
  )
);
