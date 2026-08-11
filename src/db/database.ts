import * as SQLite from 'expo-sqlite';

/**
 * Single shared SQLite connection + schema bootstrap.
 *
 * expo-sqlite persists to the app's document directory, so everything written
 * here survives app restarts and works fully offline — this is the "remembers
 * data permanently" requirement. The address book and route templates live
 * here; the in-progress route lives in memory (RouteContext) until saved.
 */

const DB_NAME = 'deliver_it_easy.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Open (once) and return the shared database, running migrations on first use. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initialise();
  }
  return dbPromise;
}

async function initialise(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // WAL mode gives us better concurrency + durability for a mobile app.
  await db.execAsync('PRAGMA journal_mode = WAL;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS addresses (
      id                TEXT PRIMARY KEY NOT NULL,
      label             TEXT,
      formatted_address TEXT NOT NULL,
      latitude          REAL NOT NULL,
      longitude         REAL NOT NULL,
      notes             TEXT,
      created_at        INTEGER NOT NULL,
      last_used_at      INTEGER NOT NULL,
      use_count         INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_addresses_formatted
      ON addresses (formatted_address);

    CREATE TABLE IF NOT EXISTS route_templates (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS route_template_stops (
      id                TEXT PRIMARY KEY NOT NULL,
      template_id       TEXT NOT NULL,
      position          INTEGER NOT NULL,
      address_id        TEXT,
      label             TEXT,
      formatted_address TEXT NOT NULL,
      latitude          REAL NOT NULL,
      longitude         REAL NOT NULL,
      notes             TEXT,
      FOREIGN KEY (template_id) REFERENCES route_templates (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_template_stops_template
      ON route_template_stops (template_id, position);

    CREATE TABLE IF NOT EXISTS delivery_proofs (
      id                TEXT PRIMARY KEY NOT NULL,
      stop_label        TEXT,
      formatted_address TEXT NOT NULL,
      latitude          REAL NOT NULL,
      longitude         REAL NOT NULL,
      recipient_name    TEXT,
      notes             TEXT,
      photo_uri         TEXT,
      signature_svg     TEXT,
      delivered_at      INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_delivery_proofs_time
      ON delivery_proofs (delivered_at DESC);
  `);

  // Enforce the cascade delete declared above.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  return db;
}

/**
 * Test/dev helper: wipe the shared connection so the next getDatabase() reopens.
 * Not used in normal app flow.
 */
export function resetDatabaseConnection(): void {
  dbPromise = null;
}
