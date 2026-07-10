import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const missingClerkEnv = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
].filter((key) => !process.env[key]);

const middleware = missingClerkEnv.length
  ? () =>
      NextResponse.json(
        {
          error: 'Missing Clerk environment variables',
          missing: missingClerkEnv,
        },
        { status: 500 }
      )
  : clerkMiddleware({
      authorizedParties: [
        'https://abumarketplace.shop',
        'https://www.abumarketplace.shop',
        'http://localhost:3000',
      ],
    });

export default middleware;

export const config = {
  matcher: [
    '/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api(?!/health)|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
