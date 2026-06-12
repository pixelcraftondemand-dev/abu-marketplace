import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware({
  authorizedParties: [
    'https://abumarketplace.shop',
    'https://www.abumarketplace.shop',
    'http://localhost:3000',
  ],
});

export const config = {
  matcher: [
    '/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api(?!/health)|trpc)(.*)',
  ],
};
