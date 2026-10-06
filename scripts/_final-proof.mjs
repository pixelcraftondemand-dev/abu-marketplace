// Final proof: create PR -> wait for checks -> merge with NO manual intervention.
// Usage: node scripts/_final-proof.mjs <branch> <head-sha>
import { execSync } from "node:child_process";

const repo = "pixelcraftondemand-dev/abu-marketplace";
const [branch, headSha] = process.argv.slice(2);
const cred = execSync('printf "protocol=https\\nhost=github.com\\n\\n" | git credential fill', { encoding: "utf8" });
const token = cred.split("\n").find((l) => l.startsWith("password="))?.slice("password=".length);
const H = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "abu-finalproof" };

const prRes = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
  method: "POST",
  headers: { ...H, "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "chore: remove test artifacts",
    head: branch,
    base: "main",
    body: "Removes the temporary merge-test.md committed by the merge-flow verification PR.",
  }),
});
const pr = await prRes.json();
console.log("PR:", prRes.status, "| #", pr.number);

// Poll until all 5 GitHub Actions checks complete
const deadline = Date.now() + 420 * 1000;
let printed = "";
while (Date.now() < deadline) {
  const runs = await (await fetch(`https://api.github.com/repos/${repo}/commits/${headSha}/check-runs`, { headers: H })).json();
  const gh = (runs.check_runs || []).filter((c) => c.app?.slug === "github-actions");
  const done = gh.length === 5 && gh.every((c) => c.status === "completed");
  const line = `checks=${gh.length} done=${gh.filter((c) => c.status === "completed").length} fail=${gh.filter((c) => c.conclusion === "failure").length}`;
  if (line !== printed) {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${line}`);
    for (const c of gh) console.log(`    ${c.name} | ${c.status} | ${c.conclusion}`);
    printed = line;
  }
  if (done) break;
  await new Promise((r) => setTimeout(r, 20000));
}

// Attempt merge WITHOUT touching protection
const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${pr.number}/merge`, {
  method: "PUT",
  headers: { ...H, "Content-Type": "application/json" },
  body: JSON.stringify({ commit_title: `chore: remove test artifacts (#${pr.number})`, merge_method: "squash" }),
});
const txt = await res.text();
console.log("\nmerge HTTP:", res.status, "|", txt.slice(0, 250));
