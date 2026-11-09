import * as SQLite from 'expo-sqlite';

const DB_NAME = 'uroom_mobile.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS draft_observations (
      id TEXT PRIMARY KEY,
      payload TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      payload TEXT,
      created_at TEXT
    );
  `);
}
