#!/usr/bin/env node
/**
 * Verifies that required Postgres tables exist on the target database.
 *
 * Used by the deploy pipeline (`.github/workflows/deploy.yml`, db-sync job)
 * AFTER the guarded delta is applied: it proves critical tables actually
 * landed on production, instead of the app silently degrading to the
 * per-instance in-memory rate-limit fallback when a migration was missed.
 *
 * Usage (CLI):
 *   DATABASE_URL=postgres://... node scripts/verify-db-tables.mjs rate_limit_entry [table ...]
 *   exit 0 = all tables present
 *   exit 1 = table(s) missing, or the database could not be queried
 *   exit 2 = usage error / invalid table identifier
 *
 * Notes:
 * - Casts to `::text` because Prisma cannot deserialize the raw `regclass` type.
 * - Identifiers come from the pipeline (developer-controlled), never from user
 *   input, but are still validated against /^[a-z_][a-z0-9_]*$/ and bound as
 *   query parameters — no string interpolation into SQL.
 */
import { PrismaClient } from "@prisma/client";

const TABLE_RE = /^[a-z_][a-z0-9_]*$/;

function main() {
  const tables = process.argv.slice(2);
  if (tables.length === 0) {
    console.error(
      "usage: DATABASE_URL=postgres://... node scripts/verify-db-tables.mjs <table> [table ...]"
    );
    process.exit(2);
  }

  const invalid = tables.filter((t) => !TABLE_RE.test(t));
  if (invalid.length > 0) {
    console.error(`Invalid table identifier(s): ${invalid.join(", ")}`);
    process.exit(2);
  }

  const prisma = new PrismaClient();

  (async () => {
    let exitCode = 0;
    const missing = [];
    const errors = [];

    for (const table of tables) {
      try {
        // Tagged-template $queryRaw binds ${table} as a parameter.
        const rows = await prisma.$queryRaw`
          SELECT to_regclass('public.' || ${table})::text AS tbl
        `;
        if (rows[0]?.tbl) {
          console.log(`  ✓ ${table} present (${rows[0].tbl})`);
        } else {
          missing.push(table);
        }
      } catch (err) {
        // Distinguish "table missing" from "could not reach/query the DB":
        // a connection failure must NOT be reported as a missing migration.
        const msg = err.message.split("\n")[0];
        console.error(`  ✗ ${table}: verification query failed: ${msg}`);
        errors.push(`${table}: ${msg}`);
      }
    }

    // Disconnect BEFORE process.exit() — exit is synchronous and would
    // otherwise skip cleanup (harmless, but keeps the pool tidy in CI).
    await prisma.$disconnect();

    if (errors.length > 0) {
      console.error(
        `\nFAILED: could not verify table(s) against the target database (connection/query errors):\n  ${errors.join("\n  ")}`
      );
      exitCode = 1;
    } else if (missing.length > 0) {
      console.error(
        `\nFAILED: required table(s) missing on target database: ${missing.join(", ")}.\n` +
          "If this is production, the additive delta did not fully apply — check the apply step output."
      );
      exitCode = 1;
    } else {
      console.log(`\nOK: all ${tables.length} required table(s) present.`);
    }
    process.exit(exitCode);
  })().catch((err) => {
    console.error(`verification aborted: ${err.message.split("\n")[0]}`);
    process.exit(1);
  });
}

main();
