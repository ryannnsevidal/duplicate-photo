/* eslint-env node */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, "..", "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id BIGSERIAL PRIMARY KEY,
			name TEXT UNIQUE NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
	`);
}

async function listMigrationFiles() {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort();
}

async function hasMigrationBeenApplied(client, name) {
  const res = await client.query(
    "SELECT 1 FROM schema_migrations WHERE name = $1",
    [name],
  );
  return res.rowCount > 0;
}

async function applyMigration(client, name) {
  const filePath = path.join(migrationsDir, name);
  const sql = await readFile(filePath, "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
      name,
    ]);
    await client.query("COMMIT");
    console.log(`Applied migration: ${name}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw Object.assign(
      new Error(`Failed migration ${name}: ${error.message}`),
      { cause: error },
    );
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await ensureMigrationsTable(client);
    const files = await listMigrationFiles();
    for (const name of files) {
      const applied = await hasMigrationBeenApplied(client, name);
      if (applied) {
        console.log(`Skipping already applied migration: ${name}`);
        continue;
      }
      await applyMigration(client, name);
    }
    console.log("Migrations complete");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
