#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i > -1 && args[i + 1] ? args[i + 1] : d;
};

const BASE = opt("url", "http://localhost:3000").replace(/\/$/, "");
const MAX_PAGES = Number(opt("max", 60));
const SLOW_MS = Number(opt("slow", 2500));
const ROOT = process.cwd();
const SERVE = has("serve");

/**
 * Git Bash rewrites `--api /api/health` into `C:/Program Files/Git/api/health` before
 * Node sees it, which made the doctor probe a path that cannot exist. Keep anything
 * from the first `/api/` segment so the check works from any shell.
 */
function normalizeApiPath(raw) {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const marker = value.toLowerCase().indexOf("/api/");
  return marker > 0 ? value.slice(marker) : value;
}

const API_PATHS = opt("api", "").split(",").map(normalizeApiPath).filter(Boolean);

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Variables the app can run without. The mail transport is optional (it falls back to
 * recording messages), the AI assistant has a local fallback, and the Better Auth
 * variables belong to an unmounted auth provider.
 */
const OPTIONAL_ENV = [/^GEMINI_API_KEY$/, /^SMTP_/, /^RESEND_/];
// Better Auth is not mounted by this server; its template variables are not runtime needs.
const SKIPPED_ENV = [/^BETTER_AUTH_/];
const isPlaceholderValue = (value) =>
  !value || /^(MY_|<)/.test(value) || /\.\.\.$/.test(value) || /^x{4,}$/i.test(value);

const results = [];
function record(section, status, title, detail = "") {
  results.push({ section, status, title, detail });
  const tag =
    status === "pass" ? C.green("PASS") : status === "warn" ? C.yellow("WARN") : C.red("FAIL");
  console.log(`  ${tag}  ${title}`);
  if (detail && status !== "pass") {
    for (const line of String(detail).split("\n").slice(0, 12)) console.log(C.dim(`        ${line}`));
  }
}
function heading(t) {
  console.log(`\n${C.bold(t)}`);
}

function run(cmd) {
  const r = spawnSync(cmd, { shell: true, cwd: ROOT, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`.trim();
  const tail = out.split("\n").slice(-25).join("\n");
  return { code: r.status ?? 1, tail };
}

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

// ---------- 1. Environment variables ----------
function checkEnv() {
  heading("Environment variables");
  const example = [".env.example", ".env.sample"].map((f) => join(ROOT, f)).find(existsSync);
  if (!example) return record("env", "warn", "No .env.example found, skipping comparison");

  const keysOf = (file) =>
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => l.split("=")[0].replace(/^export\s+/, "").trim());

  const wanted = keysOf(example);
  const values = new Map(Object.entries(process.env).map(([key, value]) => [key, value || ""]));
  for (const f of [".env.local", ".env", ".env.development.local"]) {
    const p = join(ROOT, f);
    if (existsSync(p)) {
      const lines = readFileSync(p, "utf8").split(/\r?\n/);
      for (const l of lines) {
        const m = l.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
        if (m) values.set(m[1], m[2].replace(/["']/g, "").trim());
      }
    }
  }
  // A literal `sk_live_...` copied from documentation passes every "is it set" check
  // while verifying nothing, so it counts as missing here.
  const relevant = wanted.filter((key) => !SKIPPED_ENV.some((pattern) => pattern.test(key)));
  const missing = relevant.filter((key) => isPlaceholderValue(values.get(key)));
  const isOptional = (key) => OPTIONAL_ENV.some((pattern) => pattern.test(key));
  // SMTP is only an alternative to Resend, so it is not worth a warning when Resend is set.
  const mailConfigured =
    !isPlaceholderValue(values.get("RESEND_API_KEY")) || !isPlaceholderValue(values.get("SMTP_HOST"));
  // When Resend already delivers mail, the SMTP alternative is neither required nor news.
  const substitutedByMail = (key) => /^SMTP_/.test(key) && mailConfigured;
  const optional = missing.filter((key) => isOptional(key) && !substitutedByMail(key));
  const required = missing.filter((key) => !optional.includes(key) && !substitutedByMail(key));

  if (required.length) record("env", "fail", `${required.length} required env var(s) missing or empty`, required.join("\n"));
  else record("env", "pass", `All ${relevant.length} relevant env vars from ${example.split(/[\\/]/).pop()} are set`);
  if (optional.length) {
    record("env", "warn", `${optional.length} optional env var(s) unset`, `${optional.join("\n")}\nThe app falls back safely without these; set them for the full experience.`);
  }
}

// ---------- 2. Static checks ----------
function checkStatic() {
  heading("Code health");
  const pkg = readJson(join(ROOT, "package.json"));
  if (!pkg) return record("static", "fail", "package.json not found. Run this from your project root.");
  const scripts = pkg.scripts || {};

  if (has("fix")) {
    if (existsSync(join(ROOT, "prisma", "schema.prisma"))) run("npx prisma format");
    if (scripts.lint) run("npm run lint -- --fix");
    console.log(C.dim("  Applied safe auto-fixes (prisma format, lint --fix)"));
  }

  if (existsSync(join(ROOT, "tsconfig.json"))) {
    const r = run("npx tsc --noEmit");
    record("static", r.code === 0 ? "pass" : "fail", "TypeScript", r.code === 0 ? "" : r.tail);
  }
  if (scripts.lint) {
    const r = run("npm run lint");
    record("static", r.code === 0 ? "pass" : "fail", "Lint", r.code === 0 ? "" : r.tail);
  }
  if (existsSync(join(ROOT, "prisma", "schema.prisma"))) {
    const r = run("npx prisma validate");
    record("static", r.code === 0 ? "pass" : "fail", "Prisma schema", r.code === 0 ? "" : r.tail);
  }
  if (has("build")) {
    console.log(C.dim("  Running production build, this can take a while..."));
    const r = run("npm run build");
    record("static", r.code === 0 ? "pass" : "fail", "Production build", r.code === 0 ? "" : r.tail);
  } else {
    console.log(C.dim("  Production build skipped. Add --build to include it."));
  }
}

// ---------- 3. Live site ----------
async function get(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { "user-agent": "site-doctor" } });
    const type = res.headers.get("content-type") || "";
    let body = "";
    if (type.includes("text/html") || type.includes("application/json") || type.includes("text/plain")) {
      body = await res.text();
    } else {
      await res.arrayBuffer();
    }
    return { ok: true, status: res.status, ms: Date.now() - start, type, body, headers: res.headers };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - start,
      error: e.name === "AbortError" ? "timed out after 15s" : e.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

function extract(body, re) {
  const out = [];
  let m;
  while ((m = re.exec(body))) out.push(m[1]);
  return out;
}

async function crawl() {
  heading(`Crawling ${BASE}`);
  const first = await get(BASE + "/");
  if (!first.ok) {
    return record("crawl", "fail", "Site unreachable", `${first.error}\nIs the dev server running? Try: npm run dev`);
  }

  const origin = new URL(BASE).origin;
  const seen = new Set();
  const queue = ["/"];
  const images = new Map();
  let mixed = 0;

  while (queue.length && seen.size < MAX_PAGES) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);

    const page = path === "/" ? first : await get(origin + path);
    if (!page.ok) {
      record("crawl", "fail", `${path} unreachable`, page.error);
      continue;
    }
    if (page.status >= 500) record("crawl", "fail", `${path} returned ${page.status}`);
    else if (page.status >= 400) record("crawl", "fail", `${path} returned ${page.status}`);
    else if (page.ms > SLOW_MS) record("crawl", "warn", `${path} slow: ${page.ms}ms`);
    else record("crawl", "pass", `${path} ${page.status} in ${page.ms}ms`);

    if (page.status !== 200 || !page.type.includes("text/html")) continue;

    const body = page.body;
    const title = (body.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1];
    if (!title || !title.trim()) record("seo", "warn", `${path} has no <title>`);
    if (!/<meta[^>]+name=["']description["']/i.test(body)) record("seo", "warn", `${path} has no meta description`);
    // A React/Vite shell ships an empty #root and renders its headings in the browser.
    // Counting <h1> tags in the raw HTML would always report zero for such a page.
    const isSpaShell = /id=["']root["']/i.test(body) && /<script[^>]+type=["']module["']/i.test(body);
    if (isSpaShell) {
      record("seo", "pass", `${path} is an SPA shell; headings are rendered client-side`);
    } else {
      const h1s = (body.match(/<h1[\s>]/gi) || []).length;
      if (h1s !== 1) record("seo", "warn", `${path} has ${h1s} <h1> tags, expected 1`);
    }

    for (const href of extract(body, /<a\s[^>]*href=["']([^"'#]+)["']/gi)) {
      if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
      if (/^http:\/\//i.test(href) && origin.startsWith("https")) mixed++;
      try {
        const u = new URL(href, origin + path);
        if (u.origin !== origin) continue;
        if (u.pathname.startsWith("/_next/") || u.pathname.startsWith("/api/")) continue;
        const p = u.pathname + u.search;
        if (!seen.has(p) && !queue.includes(p)) queue.push(p);
      } catch {}
    }

    for (const src of extract(body, /<img\s[^>]*src=["']([^"']+)["']/gi)) {
      if (src.startsWith("data:")) continue;
      if (/^http:\/\//i.test(src) && origin.startsWith("https")) mixed++;
      try {
        const abs = new URL(src.replace(/&amp;/g, "&"), origin + path).href;
        if (!images.has(abs)) images.set(abs, path);
      } catch {}
    }
  }

  if (queue.length) console.log(C.dim(`  Stopped at ${MAX_PAGES} pages, ${queue.length} unvisited. Raise with --max.`));
  if (mixed) record("crawl", "warn", `${mixed} insecure http:// reference(s) found on an https site`);

  heading(`Images (${Math.min(images.size, 40)} of ${images.size} checked)`);
  let bad = 0;
  for (const [url, foundOn] of [...images].slice(0, 40)) {
    const r = await get(url);
    if (!r.ok || r.status >= 400) {
      bad++;
      record("images", "fail", `Broken image on ${foundOn}`, `${url}\n${r.ok ? "status " + r.status : r.error}`);
    }
  }
  if (!bad) record("images", "pass", "No broken images in the sample");

  if (origin.startsWith("https")) {
    heading("Security headers");
    const h = first.headers;
    const wanted = [
      ["strict-transport-security", "HSTS"],
      ["x-content-type-options", "X-Content-Type-Options"],
      ["content-security-policy", "Content-Security-Policy"],
      ["referrer-policy", "Referrer-Policy"],
    ];
    for (const [name, label] of wanted) {
      if (h.get(name)) record("headers", "pass", label);
      else record("headers", "warn", `${label} header missing`);
    }
    if (!h.get("x-frame-options") && !/frame-ancestors/i.test(h.get("content-security-policy") || "")) {
      record("headers", "warn", "No clickjacking protection (X-Frame-Options or frame-ancestors)");
    }
  }
}

async function checkApis() {
  if (!API_PATHS.length) return;
  heading("API endpoints");
  for (const p of API_PATHS) {
    const url = /^https?:\/\//i.test(p) ? p : BASE + (p.startsWith("/") ? p : "/" + p);
    const r = await get(url);
    if (!r.ok) record("api", "fail", `${p} unreachable`, r.error);
    else if (r.status >= 500) record("api", "fail", `${p} returned ${r.status}`);
    else if (r.ms > SLOW_MS) {
      // A cold database connection makes the first request slow; what matters for a
      // visitor is the steady-state response, so measure one more request before warning.
      const warm = await get(url);
      if (warm.ok && warm.ms <= SLOW_MS) {
        record("api", "pass", `${p} cold start ${r.ms}ms, warm ${warm.ms}ms`);
      } else {
        record("api", "warn", `${p} slow: ${r.ms}ms then ${warm.ok ? warm.ms + "ms" : "failed"}`);
      }
    } else record("api", "pass", `${p} status ${r.status} in ${r.ms}ms`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A dev server this run started, so it can be stopped again afterwards. */
let startedServer = null;

/** Starts `npm run dev` when the site is down and --serve was passed. */
async function ensureServer() {
  const probe = await get(BASE + "/api/health");
  if (probe.ok) return true;
  if (!SERVE) return false;

  console.log(C.dim(`  Starting the app (npm run dev) and waiting for ${BASE}...`));
  const logPath = join(ROOT, ".doctor-server.log");
  const log = openSync(logPath, "w");
  startedServer = spawn("npm run dev", {
    cwd: ROOT,
    shell: true,
    // POSIX: run in its own process group so stopping it also stops npm's child.
    detached: process.platform !== "win32",
    stdio: ["ignore", log, log],
  });

  for (let attempt = 0; attempt < 90; attempt++) {
    await sleep(1000);
    const health = await get(BASE + "/api/health");
    if (health.ok) {
      console.log(C.dim(`  App is up after ${attempt + 1}s. Logs: ${logPath}`));
      return true;
    }
    if (startedServer.exitCode !== null) break;
  }
  console.log(C.dim(`  The app did not start. See ${logPath}`));
  return false;
}

/** Stops the dev server this run started, including the child processes it spawned. */
function stopServer() {
  if (!startedServer) return;
  const pid = startedServer.pid;
  startedServer = null;
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      try { process.kill(pid, "SIGTERM"); } catch {}
    }
  }
}

/**
 * Login and store approvals are the two features that fail silently when a key is
 * missing: the browser signs in, the server rejects every token, and the review queue
 * looks empty. These checks make that state visible from one command.
 */
async function checkReadiness() {
  heading("Login & store approvals");
  const health = await get(BASE + "/api/health");
  if (!health.ok) {
    return record("readiness", "fail", "Health endpoint unreachable", health.error || "The app is not responding.");
  }

  let data = {};
  try {
    data = JSON.parse(health.body || "{}");
  } catch {
    return record("readiness", "fail", "Health endpoint returned invalid JSON");
  }

  if (data?.clerkVerified) {
    record("readiness", "pass", "Clerk verified the secret key with a live request");
  } else {
    const clerkError = String(data?.clerkError || "No error was reported.");
    if (/bytestring|character at index|non-ascii/i.test(clerkError)) {
      record(
        "readiness",
        "fail",
        "CLERK_SECRET_KEY is malformed, so Clerk rejects it before any request",
        `${clerkError}\n` +
          `Deployed key: prefix ${data?.secretPrefix || "unknown"}, length ${data?.secretLength ?? "unknown"}.\n` +
          "Copy the full secret from Clerk → API keys, replace CLERK_SECRET_KEY in the deployment\n" +
          "environment and redeploy.",
      );
    } else {
      record(
        "readiness",
        "fail",
        "Clerk could not verify its secret key, so every signed-in request is rejected",
        `${clerkError}\n` +
          "Set CLERK_SECRET_KEY from the Clerk dashboard in .env and the deployment environment.",
      );
    }
  }

  if (data?.supabase) {
    record("readiness", "pass", "Supabase is configured for store applications and approvals");
  } else {
    record("readiness", "fail", "Supabase is not configured", "Store applications and approvals cannot be saved. Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  if (data?.uploads?.storeLogo === "configured") {
    record("readiness", "pass", "Store logo uploads are configured");
  } else {
    record("readiness", "warn", "Store logo uploads are not configured", "Merchants can still apply without a logo; set IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT to enable uploads.");
  }

  // The queue must exist and must refuse an anonymous caller. A 200 here would mean
  // anyone can read merchant applications; a 500 means the table or credentials are bad.
  const queue = await get(BASE + "/api/admin/store-submissions");
  if (queue.status === 401) {
    record("readiness", "pass", "Store approval queue is reachable and protected");
  } else if (queue.status >= 500) {
    record("readiness", "fail", `Store approval queue returned ${queue.status}`, "Check SUPABASE_URL, SUPABASE_SECRET_KEY and the store_submissions table.");
  } else if (queue.ok) {
    record("readiness", "fail", "Store approval queue answered an anonymous caller", "This exposes merchant applications; the route must require an admin session.");
  } else {
    record("readiness", "warn", `Store approval queue returned ${queue.status}`);
  }

  const stores = await get(BASE + "/api/stores");
  if (stores.ok && stores.status === 200) {
    let count = null;
    try { count = JSON.parse(stores.body).count; } catch {}
    record("readiness", "pass", `Public store directory responds${typeof count === "number" ? ` (${count} stores)` : ""}`);
  } else {
    record("readiness", "fail", `Public store directory returned ${stores.status || stores.error}`);
  }
}

// ---------- main ----------
async function main() {
  console.log(C.bold("site-doctor"), C.dim(`target ${BASE}`));
  if (!has("live-only")) {
    checkEnv();
    checkStatic();
  }
  if (!has("static-only")) {
    const appIsUp = await ensureServer();
    if (!appIsUp) {
      record("crawl", "fail", "Site unreachable", `fetch failed\nStart it with: npm run dev\nOr run the doctor with --serve to start it automatically.`);
    } else {
      await crawl();
      await checkApis();
      await checkReadiness();
    }
  }

  const count = (s) => results.filter((r) => r.status === s).length;
  const fails = count("fail");
  const warns = count("warn");
  heading("Summary");
  console.log(`  ${C.green(count("pass") + " passed")}   ${C.yellow(warns + " warnings")}   ${C.red(fails + " failures")}`);

  writeFileSync(
    join(ROOT, "doctor-report.json"),
    JSON.stringify({ target: BASE, date: new Date().toISOString(), results }, null, 2)
  );
  console.log(C.dim("  Full report written to doctor-report.json"));
  stopServer();
  // Setting the exit code instead of calling process.exit() lets in-flight fetch
  // sockets close cleanly; forcing exit mid-close trips a libuv assertion on Windows.
  process.exitCode = fails ? 1 : 0;
}

main().catch((error) => {
  console.error(C.red("Doctor crashed:"), error);
  stopServer();
  process.exitCode = 1;
});