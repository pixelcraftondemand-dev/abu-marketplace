/**
 * The one Clerk instance this deployment uses. Both keys come from the same
 * environment so the browser, the CSP and token verification stay aligned.
 */
export function getClerkKeys(): { publishableKey: string; secretKey: string } {
  return {
    publishableKey: (process.env.VITE_CLERK_PUBLISHABLE_KEY ?? '').trim(),
    secretKey: (process.env.CLERK_SECRET_KEY ?? '').trim(),
  };
}
