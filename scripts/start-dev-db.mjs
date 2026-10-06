import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";

const DATA_DIR = "./tmp-pgdata";
const PORT = 5433;
const DB_NAME = "abu_marketplace";
const USER = "postgres";
const PASSWORD = "postgres";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
});

// tmp-pgdata may already hold an initialized cluster from a previous run;
// initialise() runs initdb and fails on a non-empty directory, so only run it
// once and reuse the existing cluster on restarts.
const alreadyInitialized = fs.existsSync(`${DATA_DIR}/PG_VERSION`);

if (alreadyInitialized) {
  console.log(`ℹ️  Reusing existing cluster at ${DATA_DIR}`);
} else {
  await pg.initialise();
}

await pg.start();

try {
  await pg.createDatabase(DB_NAME);
} catch {
  console.log(`ℹ️  Database "${DB_NAME}" already exists (reusing).`);
}

console.log(`✅ Embedded Postgres running on port ${PORT}`);
console.log(`   DATABASE_URL=postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}`);

// Keep alive
process.on("SIGINT", async () => {
  console.log("\n🛑 Stopping embedded Postgres...");
  await pg.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pg.stop();
  process.exit(0);
});

console.log("Press Ctrl+C to stop.");
process.stdin.resume();
