import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = [
  '/sign-in',
  '/sign-up',
  '/api/health',
  '/api/inngest',
  '/auth',
  '/',
  '/shop',
  '/product',
  '/pricing',
  '/terms-and-conditions',
  '/privacy-policy',
  '/cookie-policy',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Protected routes: check for session
  const sessionCookie = request.cookies.get('better-auth.session_token');
  
  if (!sessionCookie && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api(?!/health)|trpc)(.*)',
  ],
};
