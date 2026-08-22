import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { Pool } from '@neondatabase/serverless';
import type { Lead, LeadInput } from '@/types';

/**
 * Acceso a datos de contactos.
 *
 * Estrategia:
 *  - Producción: PostgreSQL gestionado en **Neon** (`DATABASE_URL`).
 *  - Sin `DATABASE_URL`: SQLite local (`data/tecrural.db`) como respaldo para
 *    desarrollo sin conexión o despliegues que no usen Neon.
 */

// ---------------------------------------------------------------------------
// PostgreSQL (Neon)
// ---------------------------------------------------------------------------

const USE_NEON = Boolean(process.env.DATABASE_URL);

let neonPool: Pool | null = null;
let neonSchemaReady: Promise<void> | null = null;

/** La URL puede llevar `channel_binding=require` (opción de libpq); el driver
 *  serverless no la usa y algunos parseadores la rechazan. */
function neonUrl(): string {
  return (process.env.DATABASE_URL ?? '')
    .split('&')
    .filter((p) => !p.toLowerCase().startsWith('channel_binding='))
    .join('&');
}

function neon(): Pool {
  if (!neonPool) {
    neonPool = new Pool({ connectionString: neonUrl() });
  }
  return neonPool;
}

function ensureNeonSchema(): Promise<void> {
  if (!neonSchemaReady) {
    neonSchemaReady = neon()
      .query(`
        CREATE TABLE IF NOT EXISTS leads (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          municipality TEXT NOT NULL,
          crop TEXT NOT NULL,
          farm_size TEXT,
          problem TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          responded_at TIMESTAMPTZ
        );
        CREATE TABLE IF NOT EXISTS alert_logs (
          id SERIAL PRIMARY KEY,
          phone TEXT NOT NULL,
          kind TEXT NOT NULL,
          day TEXT NOT NULL,
          message TEXT NOT NULL,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_alert_logs_phone_day
          ON alert_logs (phone, day);
        DELETE FROM leads a
        USING leads b
        WHERE a.phone = b.phone
          AND a.id < b.id;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
      `)
      .then(() => undefined)
      .catch((err) => {
        neonSchemaReady = null;
        throw err;
      });
  }
  return neonSchemaReady;
}

/** Fecha local del servidor en el mismo formato que usaba SQLite. */
function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function createLeadNeon(input: LeadInput) {
  await ensureNeonSchema();
  const { rows } = await neon().query(
      `INSERT INTO leads (name, phone, municipality, crop, farm_size, problem)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (phone) DO UPDATE SET
       name = EXCLUDED.name,
       municipality = EXCLUDED.municipality,
       crop = EXCLUDED.crop,
       farm_size = EXCLUDED.farm_size,
       problem = EXCLUDED.problem
     RETURNING id, created_at`,
    [
      input.name,
      input.phone,
      input.municipality,
      input.crop,
      input.farmSize || null,
      input.problem || null,
    ]
  );
  const row = rows[0] as { id: number | string; created_at: Date };
  return { id: Number(row.id), created_at: fmtDate(row.created_at) };
}

async function listLeadsNeon(): Promise<Lead[]> {
  await ensureNeonSchema();
  const { rows } = await neon().query(
    `SELECT id, name, phone, municipality, crop,
            COALESCE(farm_size, '') AS farm_size,
            COALESCE(problem, '') AS problem,
            created_at,
            responded_at
     FROM leads
     ORDER BY id DESC`
  );
  return (rows as Array<{
    id: number | string;
    name: string;
    phone: string;
    municipality: string;
    crop: string;
    farm_size: string;
    problem: string;
    created_at: Date;
    responded_at: Date | null;
  }>).map((r) => ({
    ...r,
    id: Number(r.id),
    created_at: fmtDate(r.created_at),
    responded_at: r.responded_at ? fmtDate(r.responded_at) : null,
  }));
}

async function countLeadsNeon(): Promise<number> {
  await ensureNeonSchema();
  const { rows } = await neon().query('SELECT COUNT(*) AS n FROM leads');
  return Number((rows[0] as { n: number | string }).n);
}

async function deleteLeadNeon(id: number): Promise<boolean> {
  await ensureNeonSchema();
  const { rowCount } = await neon().query('DELETE FROM leads WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

async function markRespondedNeon(id: number): Promise<boolean> {
  await ensureNeonSchema();
  const { rowCount } = await neon().query(
    'UPDATE leads SET responded_at = now() WHERE id = $1 AND responded_at IS NULL',
    [id]
  );
  return (rowCount ?? 0) > 0;
}

async function alreadyAlertedNeon(
  phone: string,
  kind: string,
  day: string
): Promise<boolean> {
  await ensureNeonSchema();
  const { rows } = await neon().query(
    'SELECT 1 FROM alert_logs WHERE phone = $1 AND kind = $2 AND day = $3 LIMIT 1',
    [phone, kind, day]
  );
  return rows.length > 0;
}

async function markAlertedNeon(
  phone: string,
  kind: string,
  day: string,
  message: string
): Promise<void> {
  await ensureNeonSchema();
  await neon().query(
    'INSERT INTO alert_logs (phone, kind, day, message) VALUES ($1, $2, $3, $4)',
    [phone, kind, day, message]
  );
}

// ---------------------------------------------------------------------------
// SQLite (respaldo local sin DATABASE_URL)
// ---------------------------------------------------------------------------

let sqliteDb: Database.Database | null = null;

function sqlite(): Database.Database {
  if (!sqliteDb) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const db = new Database(path.join(dataDir, 'tecrural.db'));
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
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        responded_at TEXT
      );
      CREATE TABLE IF NOT EXISTS alert_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        kind TEXT NOT NULL,
        day TEXT NOT NULL,
        message TEXT NOT NULL,
        sent_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
      CREATE INDEX IF NOT EXISTS idx_alert_logs_phone_day ON alert_logs (phone, day);
      DELETE FROM leads
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM leads
        GROUP BY phone
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
    `);
    sqliteDb = db;
  }
  return sqliteDb;
}

function createLeadSqlite(input: LeadInput) {
  const info = sqlite()
    .prepare(
      `INSERT INTO leads (name, phone, municipality, crop, farm_size, problem)
       VALUES (@name, @phone, @municipality, @crop, @farmSize, @problem)
       ON CONFLICT (phone) DO UPDATE SET
         name = EXCLUDED.name,
         municipality = EXCLUDED.municipality,
         crop = EXCLUDED.crop,
         farm_size = EXCLUDED.farm_size,
         problem = EXCLUDED.problem`
    )
    .run(input);
  return sqlite()
    .prepare(`SELECT id, created_at FROM leads WHERE phone = ?`)
    .get(input.phone) as { id: number; created_at: string };
}

function listLeadsSqlite(): Lead[] {
  return sqlite()
    .prepare(
      `SELECT id, name, phone, municipality, crop, farm_size, problem, created_at, responded_at
       FROM leads
       ORDER BY id DESC`
    )
    .all() as Lead[];
}

function countLeadsSqlite(): number {
  const row = sqlite()
    .prepare('SELECT COUNT(*) AS n FROM leads')
    .get() as { n: number };
  return row.n;
}

function deleteLeadSqlite(id: number): boolean {
  return sqlite().prepare('DELETE FROM leads WHERE id = ?').run(id).changes > 0;
}

function markRespondedSqlite(id: number): boolean {
  return sqlite()
    .prepare('UPDATE leads SET responded_at = datetime(\'now\', \'localtime\') WHERE id = ? AND responded_at IS NULL')
    .run(id).changes > 0;
}

function alreadyAlertedSqlite(phone: string, kind: string, day: string): boolean {
  const row = sqlite()
    .prepare(
      'SELECT 1 FROM alert_logs WHERE phone = ? AND kind = ? AND day = ? LIMIT 1'
    )
    .get(phone, kind, day);
  return Boolean(row);
}

function markAlertedSqlite(
  phone: string,
  kind: string,
  day: string,
  message: string
): void {
  sqlite()
    .prepare(
      'INSERT INTO alert_logs (phone, kind, day, message) VALUES (?, ?, ?, ?)'
    )
    .run(phone, kind, day, message);
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export interface NewLead {
  id: number;
  created_at: string;
}

export function createLead(input: LeadInput): Promise<NewLead> {
  return USE_NEON ? createLeadNeon(input) : Promise.resolve(createLeadSqlite(input));
}

export function listLeads(): Promise<Lead[]> {
  return USE_NEON ? listLeadsNeon() : Promise.resolve(listLeadsSqlite());
}

export function countLeads(): Promise<number> {
  return USE_NEON ? countLeadsNeon() : Promise.resolve(countLeadsSqlite());
}

export function deleteLead(id: number): Promise<boolean> {
  return USE_NEON ? deleteLeadNeon(id) : Promise.resolve(deleteLeadSqlite(id));
}

export function markResponded(id: number): Promise<boolean> {
  return USE_NEON ? markRespondedNeon(id) : Promise.resolve(markRespondedSqlite(id));
}

/** ¿Ya se avisó de este tipo de alarma a este teléfono hoy? (evita duplicados). */
export function alreadyAlerted(phone: string, kind: string, day: string): Promise<boolean> {
  return USE_NEON
    ? alreadyAlertedNeon(phone, kind, day)
    : Promise.resolve(alreadyAlertedSqlite(phone, kind, day));
}

/** Registra una alarma notificada para no volver a enviarla el mismo día. */
export function markAlerted(
  phone: string,
  kind: string,
  day: string,
  message: string
): Promise<void> {
  return USE_NEON
    ? markAlertedNeon(phone, kind, day, message)
    : Promise.resolve(markAlertedSqlite(phone, kind, day, message));
}
