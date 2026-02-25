import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool, withTx } from "../src/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function run() {
  await ensureMigrationsTable();

  const files = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const existing = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE id = $1 LIMIT 1",
      [file]
    );
    if (existing.rowCount > 0) {
      console.log(`Skipping ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await withTx(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
    });
    console.log(`Applied ${file}`);
  }
}

run()
  .then(async () => {
    await pool.end();
    console.log("Migrations complete");
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
