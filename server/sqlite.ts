import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), 'addresses.sqlite');
let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      formattedAddress TEXT NOT NULL,
      addressLines TEXT,
      regionCode TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      granularity TEXT,
      complete INTEGER,
      hasUnconfirmedComponents INTEGER,
      verdictSummary TEXT,
      notes TEXT,
      meetUri TEXT,
      userId TEXT,
      userEmail TEXT,
      createdAt TEXT NOT NULL
    )
  `);
  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite file:', err);
  }
}

export interface StoredSubmission {
  id: string;
  formattedAddress: string;
  addressLines: string;
  regionCode: string;
  lat: number;
  lng: number;
  granularity: string;
  complete: boolean;
  hasUnconfirmedComponents: boolean;
  verdictSummary: string;
  notes?: string;
  meetUri?: string;
  userId?: string;
  userEmail?: string;
  createdAt: string;
}

export async function insertSubmission(sub: StoredSubmission) {
  const database = await getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO submissions (
      id, formattedAddress, addressLines, regionCode, lat, lng,
      granularity, complete, hasUnconfirmedComponents, verdictSummary,
      notes, meetUri, userId, userEmail, createdAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  stmt.run([
    sub.id,
    sub.formattedAddress,
    sub.addressLines || '',
    sub.regionCode || '',
    sub.lat,
    sub.lng,
    sub.granularity || 'UNKNOWN',
    sub.complete ? 1 : 0,
    sub.hasUnconfirmedComponents ? 1 : 0,
    sub.verdictSummary || '',
    sub.notes || '',
    sub.meetUri || '',
    sub.userId || '',
    sub.userEmail || '',
    sub.createdAt || new Date().toISOString()
  ]);
  stmt.free();
  saveDb();
}

export async function getAllSubmissions(): Promise<StoredSubmission[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT * FROM submissions ORDER BY createdAt DESC');
  const results: StoredSubmission[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: String(row.id),
      formattedAddress: String(row.formattedAddress),
      addressLines: String(row.addressLines || ''),
      regionCode: String(row.regionCode || ''),
      lat: Number(row.lat),
      lng: Number(row.lng),
      granularity: String(row.granularity || ''),
      complete: Boolean(row.complete),
      hasUnconfirmedComponents: Boolean(row.hasUnconfirmedComponents),
      verdictSummary: String(row.verdictSummary || ''),
      notes: String(row.notes || ''),
      meetUri: String(row.meetUri || ''),
      userId: String(row.userId || ''),
      userEmail: String(row.userEmail || ''),
      createdAt: String(row.createdAt)
    });
  }
  stmt.free();
  return results;
}

export async function deleteSubmissionById(id: string): Promise<boolean> {
  const database = await getDb();
  database.run('DELETE FROM submissions WHERE id = ?', [id]);
  saveDb();
  return true;
}
