/**
 * Pure core of `scripts/verify-db-tables.mjs` — testable without a database,
 * a real PrismaClient, or process.exit. The CLI wires a real PrismaClient and
 * maps the result to an exit code.
 *
 * The distinction this module is built around: a table whose `to_regclass`
 * row is `null` is MISSING (a migration did not apply), whereas a rejected
 * query is a CONNECTION/query failure — the two must never be conflated,
 * because the deploy pipeline's failure message differs ("apply the delta"
 * vs "could not verify against the database").
 */
const TABLE_RE = /^[a-z_][a-z0-9_]*$/;

/**
 * Identifiers that fail the allowed table-name pattern. The CLI exits 2 when
 * any are present (they come from the pipeline, but are still validated and
 * never interpolated into SQL).
 */
export function invalidIdentifiers(tables) {
  return (tables || []).filter((t) => !TABLE_RE.test(t));
}

/**
 * Query each table via the injected client (anything exposing the Prisma
 * `$queryRaw` tagged template) and classify the outcome.
 *
 * @param {{ $queryRaw: Function }} prisma
 * @param {string[]} tables
 * @returns {Promise<{ present: Array<{ table: string, name: string }>, missing: string[], errors: string[] }>}
 *   `present` — tables verified with their resolved regclass name.
 *   `missing` — tables whose regclass lookup returned null (NOT applied).
 *   `errors`  — tables whose query failed (connection/query failure).
 */
export async function verifyDbTables(prisma, tables) {
  const present = [];
  const missing = [];
  const errors = [];

  for (const table of tables) {
    try {
      // Tagged-template $queryRaw binds ${table} as a parameter.
      const rows = await prisma.$queryRaw`
        SELECT to_regclass('public.' || ${table})::text AS tbl
      `;
      if (rows[0]?.tbl) {
        present.push({ table, name: rows[0].tbl });
      } else {
        missing.push(table);
      }
    } catch (err) {
      // Connection failure must NOT be reported as a missing migration.
      const msg = err.message.split("\n")[0];
      errors.push(`${table}: ${msg}`);
    }
  }

  return { present, missing, errors };
}

/**
 * CLI exit-code mapping: 0 = everything verified present, 1 = anything
 * missing or unverifiable (either way the deploy must fail loudly).
 */
export function exitCodeFor({ missing, errors }) {
  if (errors.length > 0 || missing.length > 0) return 1;
  return 0;
}
