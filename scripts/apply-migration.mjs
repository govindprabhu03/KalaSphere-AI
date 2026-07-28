/**
 * Applies a SQL migration over a direct Postgres connection.
 * The whole file runs as ONE implicit transaction — if anything fails,
 * nothing is applied (safe to fix and re-run).
 *
 * Usage:  node scripts/apply-migration.mjs [path-to-sql]
 * Default: supabase/migrations/0001_init_tenancy.sql
 * Requires: DATABASE_URL in .env.local (Supabase "Session pooler" URI).
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import pg from "pg";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";
if (!url || url.includes("REPLACE_ME") || url.includes("<")) {
  console.error(
    "❌ DATABASE_URL is not set in .env.local.\n" +
      "   Supabase → Settings → Database → Connection string → Session pooler,\n" +
      "   then replace [YOUR-PASSWORD] with your database password.",
  );
  process.exit(1);
}

const file = process.argv[2] ?? "supabase/migrations/0001_init_tenancy.sql";
const sql = readFileSync(file, "utf8");

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log(`✅ Applied migration: ${file}`);
} catch (e) {
  console.error(`❌ Migration failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
