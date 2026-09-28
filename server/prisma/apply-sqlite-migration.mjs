import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const databasePath = path.resolve('prisma/dev.db');
const migrationPath = path.resolve('prisma/migrations/20260928000000_init/migration.sql');
const db = new DatabaseSync(databasePath);
const initialized = db
  .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'Organization'")
  .get().count;
if (!initialized) {
  db.exec(readFileSync(migrationPath, 'utf8'));
  console.log(`Applied SQLite migration to ${databasePath}`);
} else {
  console.log(`SQLite schema already initialized at ${databasePath}`);
}
db.close();
