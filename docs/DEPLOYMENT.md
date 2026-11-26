# Deployment

## Clerk environment variables

Set these in Vercel under **Project → Settings → Environment Variables** for Production (and
Preview if sign-in should work there):

| Variable | Used by | Required | Purpose |
| --- | --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Browser build | Yes | Publishes the Clerk instance to the page and the CSP. Inlined at build time. |
| `CLERK_SECRET_KEY` | API server | Yes | Verifies session tokens and answers the `/api/health` key check. |
| `CLERK_AUTHORIZED_PARTIES` | API server | No | Comma-separated origins whose sessions the API trusts. Both the apex and `www` host should be listed. |

Both keys must come from the **same Clerk instance**. The app reads them in one place
(`server/clerkKeys.ts`), and the browser, the CSP, and API token verification all use that
pair. If they disagree, sign-in appears to work but every signed-in API request returns 401.

`VITE_CLERK_PUBLISHABLE_KEY` is baked in during the build, so redeploy after changing it.
`CLERK_SECRET_KEY` is read at runtime, but redeploying is still the simplest way to make
sure every server instance has the new value.

## Removed variables

These are no longer read by the app and can be deleted from Vercel and local `.env` files:

- `CLERK_DEV_PUBLISHABLE_KEY`
- `CLERK_DEV_SECRET_KEY`
- `CLERK_USE_DEV_INSTANCE`
- Any `NEXT_PUBLIC_CLERK_*` fallbacks

## Verify the Clerk setup

`GET /api/health` makes one real Clerk call with the server key and is never cached:

```bash
curl -s https://abumarketplace.shop/api/health
```

```json
{
  "status": "healthy",
  "currency": "SLE",
  "clerkVerified": true,
  "clerkError": null,
  "secretPrefix": "sk_live_",
  "secretLength": 52,
  "supabase": true,
  "uploads": { "storeLogo": "configured" }
}
```

`clerkVerified: false` means the secret was rejected; `clerkError` carries the short reason
(for example `Unauthorized`). Only the first 8 characters and the length of the secret are
returned, never the full key. Admins also see this failure in the app banner, and
`npm run doctor` reports it.
