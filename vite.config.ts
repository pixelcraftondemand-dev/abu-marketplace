import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin} from 'vite';
import {resolveClerkKeys} from './server/clerkKeys';

/**
 * Publishes the resolved Clerk instance to the page.
 *
 * A <meta> tag (rather than a `define`) because Vite only substitutes defines in the
 * client build, not in the dev server's client modules.
 *
 * Clerk also loads clerk-js (plus its UI chunks, ~300 KB) from the instance's
 * frontend API host the moment <ClerkProvider> mounts. Opening a warm connection
 * while the browser is still parsing the page hides that DNS + TLS handshake from
 * the sign-in flow, which otherwise waits for it before the form can render.
 */
function clerkInstance(publishableKey: string): Plugin {
  const encoded = publishableKey?.trim().match(/^pk_(?:test|live)_(.+)$/)?.[1]?.replace(/\$+$/, '');
  let host: string | null = null;
  if (encoded) {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$+$/, '');
      host = /^[a-z0-9.-]+$/i.test(decoded) ? decoded : null;
    } catch {
      host = null;
    }
  }

  return {
    name: 'abu-clerk-instance',
    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [];
      if (publishableKey) {
        tags.push({ tag: 'meta', attrs: { name: 'clerk-publishable-key', content: publishableKey }, injectTo: 'head' });
      }
      if (host) {
        tags.push(
          { tag: 'link', attrs: { rel: 'preconnect', href: `https://${host}` }, injectTo: 'head-prepend' },
          { tag: 'link', attrs: { rel: 'dns-prefetch', href: `https://${host}` }, injectTo: 'head-prepend' },
        );
      }
      return tags;
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Local dev and preview builds sign in with the development instance; production
  // keeps the live one. main.tsx, the CSP and token verification all read this.
  const clerk = resolveClerkKeys(env, {mode});
  return {
    plugins: [react(), tailwindcss(), clerkInstance(clerk.publishableKey)],
    resolve: {
      alias: {
        '@': import.meta.dirname,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Explicitly configure clientPort: 443 and protocol: 'wss' for stable secure WebSocket connection behind proxy.
      hmr: process.env.DISABLE_HMR === 'true'
        ? false
        : {
            clientPort: 443,
            protocol: 'wss',
          },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
