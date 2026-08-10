#!/usr/bin/env node
/**
 * Verifies that required Postgres tables exist on the target database.
 *
 * Used by the deploy pipeline (`.github/workflows/deploy.yml`, db-sync job)
 * AFTER the guarded delta is applied: it proves critical tables actually
 * landed on production, instead of the app silently degrading to the
 * per-instance in-memory rate-limit fallback when a migration was missed.
 *
 * Thin CLI over the testable core in lib/verifyDbTables.js.
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
import { invalidIdentifiers, verifyDbTables, exitCodeFor } from "../lib/verifyDbTables.mjs";

function main() {
  const tables = process.argv.slice(2);
  if (tables.length === 0) {
    console.error(
      "usage: DATABASE_URL=postgres://... node scripts/verify-db-tables.mjs <table> [table ...]"
    );
    process.exit(2);
  }

  const invalid = invalidIdentifiers(tables);
  if (invalid.length > 0) {
    console.error(`Invalid table identifier(s): ${invalid.join(", ")}`);
    process.exit(2);
  }

  const prisma = new PrismaClient();

  (async () => {
    const { present, missing, errors } = await verifyDbTables(prisma, tables);

    // Disconnect BEFORE process.exit() — exit is synchronous and would
    // otherwise skip cleanup (harmless, but keeps the pool tidy in CI).
    await prisma.$disconnect();

    for (const { table, name } of present) {
      console.log(`  ✓ ${table} present (${name})`);
    }
    for (const error of errors) {
      console.error(`  ✗ ${error}`);
    }

    const exitCode = exitCodeFor({ missing, errors });
    if (errors.length > 0) {
      console.error(
        `\nFAILED: could not verify table(s) against the target database (connection/query errors):\n  ${errors.join("\n  ")}`
      );
    } else if (missing.length > 0) {
      console.error(
        `\nFAILED: required table(s) missing on target database: ${missing.join(", ")}.\n` +
          "If this is production, the additive delta did not fully apply — check the apply step output."
      );
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
