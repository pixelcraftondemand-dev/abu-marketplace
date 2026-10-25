import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { CLERK_PUBLISHABLE_KEY, isClerkKeyValid } from './clerk';

interface AppClerkProviderProps {
  children: React.ReactNode;
}

export const AppClerkProvider: React.FC<AppClerkProviderProps> = ({ children }) => {
  if (isClerkKeyValid(CLERK_PUBLISHABLE_KEY)) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        {children}
      </ClerkProvider>
    );
  }

  // Graceful fallback when publishable key is not yet set in environment
  return <>{children}</>;
};
