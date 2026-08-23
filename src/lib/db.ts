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
          alerts_consent BOOLEAN NOT NULL DEFAULT FALSE,
          marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          responded_at TIMESTAMPTZ
        );
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS alerts_consent BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE;
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
      `INSERT INTO leads (name, phone, municipality, crop, farm_size, problem, alerts_consent, marketing_consent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (phone) DO UPDATE SET
       name = EXCLUDED.name,
       municipality = EXCLUDED.municipality,
       crop = EXCLUDED.crop,
       farm_size = EXCLUDED.farm_size,
       problem = EXCLUDED.problem,
       alerts_consent = EXCLUDED.alerts_consent,
       marketing_consent = EXCLUDED.marketing_consent
     RETURNING id, created_at`,
    [
      input.name,
      input.phone,
      input.municipality,
      input.crop,
      input.farmSize || null,
      input.problem || null,
      input.alertsConsent,
      input.marketingConsent,
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
            alerts_consent,
            marketing_consent,
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
    alerts_consent: boolean;
    marketing_consent: boolean;
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
        alerts_consent INTEGER NOT NULL DEFAULT 0,
        marketing_consent INTEGER NOT NULL DEFAULT 0,
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
    // Migración para bases creadas antes de separar los consentimientos.
    const leadCols = (
      db.prepare('PRAGMA table_info(leads)').all() as Array<{ name: string }>
    ).map((c) => c.name);
    if (!leadCols.includes('alerts_consent')) {
      db.exec(
        'ALTER TABLE leads ADD COLUMN alerts_consent INTEGER NOT NULL DEFAULT 0'
      );
    }
    if (!leadCols.includes('marketing_consent')) {
      db.exec(
        'ALTER TABLE leads ADD COLUMN marketing_consent INTEGER NOT NULL DEFAULT 0'
      );
    }
    sqliteDb = db;
  }
  return sqliteDb;
}

function createLeadSqlite(input: LeadInput) {
  // better-sqlite3 no acepta booleanos: se guardan como 0/1.
  const params = {
    name: input.name,
    phone: input.phone,
    municipality: input.municipality,
    crop: input.crop,
    farmSize: input.farmSize,
    problem: input.problem,
    alertsConsent: input.alertsConsent ? 1 : 0,
    marketingConsent: input.marketingConsent ? 1 : 0,
  };
  const info = sqlite()
    .prepare(
      `INSERT INTO leads (name, phone, municipality, crop, farm_size, problem, alerts_consent, marketing_consent)
       VALUES (@name, @phone, @municipality, @crop, @farmSize, @problem, @alertsConsent, @marketingConsent)
       ON CONFLICT (phone) DO UPDATE SET
         name = EXCLUDED.name,
         municipality = EXCLUDED.municipality,
         crop = EXCLUDED.crop,
         farm_size = EXCLUDED.farm_size,
         problem = EXCLUDED.problem,
         alerts_consent = EXCLUDED.alerts_consent,
         marketing_consent = EXCLUDED.marketing_consent`
    )
    .run(params);
  return sqlite()
    .prepare(`SELECT id, created_at FROM leads WHERE phone = ?`)
    .get(input.phone) as { id: number; created_at: string };
}

type LeadRowSqlite = Omit<Lead, 'alerts_consent' | 'marketing_consent'> & {
  alerts_consent: number;
  marketing_consent: number;
};

function listLeadsSqlite(): Lead[] {
  return (
    sqlite()
      .prepare(
        `SELECT id, name, phone, municipality, crop, farm_size, problem,
                alerts_consent, marketing_consent, created_at, responded_at
         FROM leads
         ORDER BY id DESC`
      )
      .all() as unknown as LeadRowSqlite[]
  ).map((r) => ({
    ...r,
    alerts_consent: Boolean(r.alerts_consent),
    marketing_consent: Boolean(r.marketing_consent),
  }));
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
