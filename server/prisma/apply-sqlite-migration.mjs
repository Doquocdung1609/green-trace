import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const databasePath = path.resolve('prisma/dev.db');
const db = new DatabaseSync(databasePath);
db.exec('CREATE TABLE IF NOT EXISTS "_GreenTraceMigration" ("name" TEXT NOT NULL PRIMARY KEY, "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
const initialized = db
  .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'Organization'")
  .get().count;
const migrationsRoot = path.resolve('prisma/migrations');
const migrations = readdirSync(migrationsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (initialized) {
  db.prepare('INSERT OR IGNORE INTO "_GreenTraceMigration" ("name") VALUES (?)').run('20260928000000_init');
}
for (const migration of migrations) {
  const applied = db.prepare('SELECT 1 FROM "_GreenTraceMigration" WHERE "name" = ?').get(migration);
  if (applied) continue;
  const sql = readFileSync(path.join(migrationsRoot, migration, 'migration.sql'), 'utf8');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(sql);
    db.prepare('INSERT INTO "_GreenTraceMigration" ("name") VALUES (?)').run(migration);
    db.exec('COMMIT');
    console.log(`Applied ${migration}`);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
console.log(`SQLite schema is current at ${databasePath}`);
db.close();
