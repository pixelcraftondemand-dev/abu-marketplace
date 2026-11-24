/**
 * Resolves which Clerk instance this deployment signs users in against.
 *
 * Clerk rejects any request whose Origin is not the instance's production domain, so
 * production keys cannot sign anyone in on localhost or a preview URL. Production
 * deployments keep the live instance; local development and preview builds use the
 * separate development instance when its keys are configured.
 *
 * Every key is resolved here together on purpose: the browser build, the CSP that
 * allows Clerk's hosts, and server-side token verification must agree on the same
 * instance. Picking them independently is how a sign-in succeeds in the browser and
 * is then rejected by the API.
 */
export type ClerkEnvironment = 'development' | 'production';

export interface ClerkKeys {
  environment: ClerkEnvironment;
  publishableKey: string;
  secretKey: string;
}

type Env = Record<string, string | undefined>;

const trimmed = (value: string | undefined): string | undefined => {
  const v = value?.trim();
  return v ? v : undefined;
};

/**
 * True when a value that starts like a Clerk key is really a redacted placeholder, such
 * as `sk_live_…` copied out of the documentation. Such a value passes a prefix test but
 * cannot verify a single token, which is how a deployment reported a healthy live key
 * while refusing every signed-in request.
 */
export function isRedactedClerkKey(key: string | null | undefined): boolean {
  if (!key) return false;
  if ([...key].some((character) => character.charCodeAt(0) > 0x7f)) return true;
  return key.includes('...');
}

export function resolveClerkKeys(env: Env = process.env, options: { mode?: string } = {}): ClerkKeys {
  const livePublishableKey =
    trimmed(env.VITE_CLERK_PUBLISHABLE_KEY) ?? trimmed(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) ?? '';
  const liveSecretKey = trimmed(env.CLERK_SECRET_KEY) ?? '';
  const devPublishableKey = trimmed(env.CLERK_DEV_PUBLISHABLE_KEY);
  const devSecretKey = trimmed(env.CLERK_DEV_SECRET_KEY);

  // Vite builds previews in "production" mode, so Vercel's own environment flag wins.
  const buildMode = options.mode ?? (env.NODE_ENV === 'production' ? 'production' : 'development');
  const isProductionDeployment = buildMode === 'production' && env.VERCEL_ENV !== 'preview';
  const wantsDevelopmentInstance = env.CLERK_USE_DEV_INSTANCE === 'true' || !isProductionDeployment;

  if (wantsDevelopmentInstance && devPublishableKey && devSecretKey) {
    return { environment: 'development', publishableKey: devPublishableKey, secretKey: devSecretKey };
  }

  return { environment: 'production', publishableKey: livePublishableKey, secretKey: liveSecretKey };
}
