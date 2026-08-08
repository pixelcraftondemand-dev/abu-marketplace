#!/usr/bin/env node
/**
 * Migration safety guard for CI/CD.
 *
 * Given a Prisma-generated migration diff (the output of
 * `prisma migrate diff --from-url <db> --to-schema-datamodel prisma/schema.prisma --script`),
 * this classifies every SQL statement as SAFE (additive-only) or UNSAFE.
 *
 * Only additive changes are ever auto-applied to production by the deploy
 * pipeline. Anything destructive or unrecognized fails the deploy loudly so a
 * human can review the SQL by hand. This prevents the class of bug where an
 * out-of-sync schema (e.g. the empty baseline migration) silently breaks the
 * catalog in production.
 *
 * Usage (CLI):
 *   node lib/migrationGuard.mjs <diff.sql>
 *   exit 0 = additive-only, safe to apply
 *   exit 1 = contains destructive/unknown statements, require review
 *   exit 2 = usage error
 *
 * Usage (module):
 *   import { classifyMigration } from "@/lib/migrationGuard.mjs";
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Allowlist of statement shapes that are safe to auto-apply.
 * Order matters: statements are matched against these in order.
 * Anything that matches none of them is treated as unsafe (unknown).
 */
const SAFE_PATTERNS = [
  { label: "CREATE TABLE", re: /^\s*CREATE\s+(?:UNLOGGED\s+|IF\s+NOT\s+EXISTS\s+)?TABLE\b/i },
  { label: "CREATE INDEX", re: /^\s*CREATE\s+(?:UNIQUE\s+)?(?:INDEX|INDEX\s+IF\s+NOT\s+EXISTS)\b/i },
  { label: "CREATE TYPE", re: /^\s*CREATE\s+TYPE\b/i },
  { label: "CREATE SCHEMA", re: /^\s*CREATE\s+SCHEMA\b/i },
  { label: "ALTER TABLE ADD", re: /^\s*ALTER\s+TABLE\b[\s\S]*\bADD\s+(?:COLUMN\s+)?[A-Z_"]/i },
  { label: "ALTER TYPE ADD VALUE", re: /^\s*ALTER\s+TYPE\b[\s\S]*\bADD\s+VALUE\b/i },
  // SET NOT NULL / SET DEFAULT only. Deliberately NOT a bare `\bSET\b`:
  // `ALTER COLUMN ... SET DATA TYPE` is a destructive type change and must be
  // blocked, even though it also contains the word SET.
  { label: "ALTER COLUMN SET", re: /^\s*ALTER\s+TABLE\b[\s\S]*\bALTER\s+COLUMN\b[\s\S]*\bSET\s+(?:NOT\s+NULL|DEFAULT)\b/i },
  { label: "COMMENT ON", re: /^\s*COMMENT\s+ON\b/i },
];

/** Common destructive shapes, used only to produce a friendlier error message. */
const DESTRUCTIVE_LABEL = [
  { label: "DROP", re: /\bDROP\s+(?:TABLE|COLUMN|INDEX|CONSTRAINT|TYPE|SCHEMA|VIEW|FUNCTION|DATABASE|TRIGGER|POLICY)\b/i },
  { label: "TRUNCATE", re: /\bTRUNCATE\b/i },
  { label: "DELETE", re: /\bDELETE\s+FROM\b/i },
  { label: "ALTER COLUMN TYPE/DROP", re: /\bALTER\s+COLUMN\b[\s\S]*(?:\bTYPE\b|\bDROP\b)/i },
  { label: "RENAME", re: /\bRENAME\b/i },
  { label: "REINDEX", re: /\bREINDEX\b/i },
];

/** Split raw SQL into statements, dropping `--` comment lines and blanks. */
export function splitStatements(sql) {
  const body = String(sql)
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return body
    .split(";")
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

function labelStatement(stmt) {
  const matched = SAFE_PATTERNS.find(({ re }) => re.test(stmt));
  if (matched) return { safe: true, label: matched.label };
  const destructive = DESTRUCTIVE_LABEL.find(({ re }) => re.test(stmt));
  return { safe: false, label: destructive ? `DESTRUCTIVE (${destructive.label})` : "UNKNOWN" };
}

/**
 * @param {string} sql Raw migration SQL (may be empty / comment-only).
 * @returns {{ safe: boolean, statements: Array<{statement: string, safe: boolean, label: string}>, destructive: Array<{statement: string, safe: boolean, label: string}>, summary: {total: number, safe: number, unsafe: number} }}
 */
export function classifyMigration(sql) {
  const statements = splitStatements(sql).map((statement) => ({
    statement,
    ...labelStatement(statement),
  }));
  const destructive = statements.filter((s) => !s.safe);
  return {
    safe: destructive.length === 0,
    statements,
    destructive,
    summary: {
      total: statements.length,
      safe: statements.length - destructive.length,
      unsafe: destructive.length,
    },
  };
}

/** CLI entry point. */
function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node lib/migrationGuard.mjs <diff.sql>");
    process.exit(2);
  }

  let sql;
  try {
    sql = readFileSync(file, "utf8");
  } catch (err) {
    console.error(`Cannot read ${file}: ${err.message}`);
    process.exit(2);
  }

  const result = classifyMigration(sql);

  if (result.summary.total === 0) {
    console.log("No schema changes (database is already in sync with the schema). SAFE.");
    process.exit(0);
  }

  console.log(`Migration diff: ${result.summary.total} statement(s) (${result.summary.safe} safe, ${result.summary.unsafe} unsafe).`);
  for (const s of result.destructive) {
    console.error(`UNSAFE [${s.label}]: ${s.statement.split("\n").join(" ").slice(0, 200)}`);
  }

  if (result.safe) {
    console.log("SAFE: additive-only changes. OK to auto-apply.");
    process.exit(0);
  }
  console.error("BLOCKED: destructive or unrecognized statements require manual review.");
  process.exit(1);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
