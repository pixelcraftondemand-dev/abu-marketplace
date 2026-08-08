// ─────────────────────────────────────────────────────────────────────────────
// Local PostgreSQL bootstrap for development / e2e testing.
//
// Uses the `embedded-postgres` package (real Postgres binaries, no Docker).
// Initializes a data directory under .local-pg, starts the server on port 5433,
// and creates the `abu_marketplace` database if it does not exist.
//
// Usage:  node scripts/local-postgres.mjs [start|stop|status|init]
// ─────────────────────────────────────────────────────────────────────────────
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, ".local-pg", "data");
const PORT = Number(process.env.LOCAL_PG_PORT || 5433);
const DB_NAME = process.env.LOCAL_PG_DB || "abu_marketplace";
const USER = "postgres";
const PASSWORD = "postgres";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

const command = process.argv[2] || "start";

async function ensureDatabase() {
  try {
    await pg.initialise();
    await pg.start();
    const client = pg.getPgClient();
    await client.connect();
    const { rows } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DB_NAME]
    );
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Created database "${DB_NAME}".`);
    } else {
      console.log(`Database "${DB_NAME}" already exists.`);
    }
    await client.end();
  } finally {
    await pg.stop();
  }
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (command === "status") {
    const socket = net.connect({ host: "127.0.0.1", port: PORT });
    socket.on("connect", () => {
      console.log(`Postgres is RUNNING on 127.0.0.1:${PORT}`);
      socket.destroy();
      process.exit(0);
    });
    socket.on("error", () => {
      console.log(`Postgres is NOT running on 127.0.0.1:${PORT}`);
      process.exit(1);
    });
    return;
  }

  if (command === "stop") {
    await pg.stop();
    console.log("Postgres stopped.");
    return;
  }

  if (command === "init") {
    await ensureDatabase();
    console.log(
      "Postgres initialized. Start it with: node scripts/local-postgres.mjs start"
    );
    return;
  }

  // Default: start in the foreground.
  console.log(
    `Starting local Postgres on 127.0.0.1:${PORT} (data: ${DATA_DIR})...`
  );
  if (!fs.existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.log("Data directory not initialized - initializing first...");
    await pg.initialise();
  }
  await pg.start();

  // Ensure the app database exists even on a warm start.
  try {
    const client = pg.getPgClient();
    await client.connect();
    const { rows } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DB_NAME]
    );
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Created database "${DB_NAME}".`);
    }
    await client.end();
  } catch (e) {
    // Non-fatal; the database check can race during startup.
    console.warn("db check skipped:", e.message);
  }

  console.log("Local Postgres is running. Press Ctrl+C to stop.");
  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("local-postgres error:", error.message);
  process.exit(1);
});
