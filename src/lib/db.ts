import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Lead, LeadInput } from '@/types';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'tecrural.db');

declare global {
  // eslint-disable-next-line no-var
  var __tecruralDb: Database.Database | undefined;
}

function initDb(): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      municipality TEXT NOT NULL,
      crop TEXT NOT NULL,
      farm_size TEXT,
      problem TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);
  return db;
}

const db = global.__tecruralDb ?? initDb();
if (process.env.NODE_ENV !== 'production') {
  global.__tecruralDb = db;
}

export interface NewLead {
  id: number;
  created_at: string;
}

const insertLead = db.prepare(`
  INSERT INTO leads (name, phone, municipality, crop, farm_size, problem)
  VALUES (@name, @phone, @municipality, @crop, @farmSize, @problem)
`);

export function createLead(input: LeadInput): NewLead {
  const info = insertLead.run(input);
  const row = db
    .prepare(`SELECT id, created_at FROM leads WHERE id = ?`)
    .get(info.lastInsertRowid) as { id: number; created_at: string };
  return row;
}

const listLeadsStmt = db.prepare(`
  SELECT id, name, phone, municipality, crop, farm_size, problem, created_at
  FROM leads
  ORDER BY id DESC
`);

export function listLeads(): Lead[] {
  return listLeadsStmt.all() as Lead[];
}

export function countLeads(): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM leads').get() as {
    n: number;
  };
  return row.n;
}

export function deleteLead(id: number): boolean {
  const info = db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  return info.changes > 0;
}
