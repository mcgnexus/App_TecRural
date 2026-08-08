import type { CurrentWeather, DailyForecast } from './weather';

const BASE = 'https://opendata.aemet.es/opendata/api';

export interface AemetToday {
  current: CurrentWeather;
  today: DailyForecast;
  elaboratedAt: string;
  /** true si se obtuvo la predicción horaria (condiciones actuales fiables). */
  hasHourly: boolean;
}

export type AvisoNivel = 'amarillo' | 'naranja' | 'rojo';

/** Aviso de fenómeno meteorológico adverso (Plan Meteoalerta de AEMET). */
export interface AemetAviso {
  nivel: AvisoNivel;
  /** Fenómeno legible, p. ej. "Temperaturas máximas" o "Tormentas". */
  fenomeno: string;
  /** Valor del parámetro si lo hay, p. ej. "38 ºC" o "20 mm en 1 hora". */
  valor: string;
  /** Zona del Plan Meteoalerta, p. ej. "Cuenca del Genil". */
  zona: string;
  /** Inicio del aviso en hora oficial local (ISO). */
  inicio: string;
  /** Fin del aviso en hora oficial local (ISO). */
  fin: string;
  descripcion: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return [];
}

async function fetchAsJson(url: string, key: string, timeoutMs: number): Promise<unknown> {
  const res = await fetch(url, {
    headers: { api_key: key },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`AEMET HTTP ${res.status}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  // AEMET sirve los datos en ISO-8859-1; decodificamos para conservar las tildes.
  return JSON.parse(new TextDecoder('iso-8859-1').decode(buf));
}

/**
 * Cliente AEMET en dos pasos: primero pide el endpoint (devuelve un enlace
 * temporal `datos`) y después descarga el JSON con la misma api_key.
 */
async function fetchAemetJson(path: string, retries = 2): Promise<unknown | null> {
  const key = process.env.AEMET_API_KEY || '';
  if (!key) return null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const meta = (await fetchAsJson(`${BASE}/${path}`, key, 8000)) as {
        datos?: string;
      };
      if (!meta?.datos) {
        throw new Error('AEMET no devolvió enlace de datos');
      }
      await delay(500);
      return await fetchAsJson(meta.datos, key, 12000);
    } catch (err) {
      if (attempt === retries - 1) {
        console.warn('[aemet] petición fallida:', path, err);
        return null;
      }
      await delay(1200 * (attempt + 1));
    }
  }
  return null;
}

interface PeriodEntry {
  periodo?: string;
  value?: string | number;
  descripcion?: string;
}

interface VientoEntry extends PeriodEntry {
  direccion?: string[];
  velocidad?: (string | number)[];
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Hora local de Madrid (la predicción horaria de AEMET usa esta zona). */
function madridHour(date: Date): number {
  const parts = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  return h % 24;
}

function pickHour(entries: PeriodEntry[] | undefined, hour: number): PeriodEntry | undefined {
  if (!entries?.length) return undefined;
  return entries.find((e) => Number(e.periodo) === hour) ?? entries[0];
}

function nearestDato(
  dato: { hora: number; value: number }[] | undefined,
  hour: number
): number | undefined {
  if (!dato?.length) return undefined;
  let best = dato[0];
  for (const d of dato) {
    if (Math.abs(d.hora - hour) < Math.abs(best.hora - hour)) best = d;
  }
  return best.value;
}

function maxOf(values: PeriodEntry[] | undefined): number {
  if (!values?.length) return 0;
  return Math.max(...values.map((v) => toNumber(v.value)));
}

function parseVientoAndRacha(
  entries: VientoEntry[] | undefined
): Map<string, { speed?: number; gust?: number }> {
  const map = new Map<string, { speed?: number; gust?: number }>();
  for (const e of entries ?? []) {
    const p = e.periodo ?? '';
    if (!p) continue;
    const cur = map.get(p) ?? {};
    if (e.velocidad?.length) cur.speed = toNumber(e.velocidad[0]);
    if (e.value !== undefined && !e.direccion) cur.gust = toNumber(e.value);
    map.set(p, cur);
  }
  return map;
}

export async function getAemetToday(aemetCode: string): Promise<AemetToday | null> {
  const [dailyRaw, hourlyRaw] = await Promise.all([
    fetchAemetJson(`prediccion/especifica/municipio/diaria/${aemetCode}`),
    fetchAemetJson(`prediccion/especifica/municipio/horaria/${aemetCode}`),
  ]);

  const daily = asArray(dailyRaw)[0];
  const hourly = asArray(hourlyRaw)[0];

  if (!daily && !hourly) return null;

  const elaboratedAt =
    daily?.elaborado ?? hourly?.elaborado ?? new Date().toISOString();
  const hour = madridHour(new Date());

  const diaH = hourly?.prediccion?.dia?.[0];
  const diaD = daily?.prediccion?.dia?.[0];

  const hourlyTemp = diaH?.temperatura as PeriodEntry[] | undefined;
  const hourlyHum = diaH?.humedadRelativa as PeriodEntry[] | undefined;
  const hourlySens = diaH?.sensTermica as PeriodEntry[] | undefined;
  const hourlyPrecip = diaH?.precipitacion as PeriodEntry[] | undefined;
  const hourlySky = diaH?.estadoCielo as PeriodEntry[] | undefined;
  const wind = parseVientoAndRacha(diaH?.vientoAndRachaMax as VientoEntry[] | undefined);

  const currentHourWind = wind.get(String(hour));
  const skyNow = pickHour(hourlySky, hour);
  const tempNow = hourlyTemp
    ? pickHour(hourlyTemp, hour)?.value
    : nearestDato(diaD?.temperatura?.dato, hour);
  const humNow = hourlyHum
    ? pickHour(hourlyHum, hour)?.value
    : nearestDato(diaD?.humedadRelativa?.dato, hour);
  const sensNow = hourlySens ? pickHour(hourlySens, hour)?.value : tempNow;

  // Viento máximo del día (diaria) como respaldo de rachas
  const dailyWindMax = maxOf(diaD?.viento as PeriodEntry[] | undefined);

  const current: CurrentWeather = {
    temperature: toNumber(tempNow),
    apparentTemperature: toNumber(sensNow ?? tempNow),
    humidity: toNumber(humNow),
    windSpeed: currentHourWind?.speed ?? dailyWindMax ?? 0,
    windGusts: currentHourWind?.gust ?? dailyWindMax ?? 0,
    precipitation: toNumber(pickHour(hourlyPrecip, hour)?.value),
    weatherCode: 0,
    isDay: hour >= 7 && hour <= 20,
    condition: skyNow?.descripcion || diaD?.estadoCielo?.[0]?.descripcion,
  };

  const today: DailyForecast = {
    date: (diaD?.fecha ?? diaH?.fecha ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    tempMax:
      toNumber(diaD?.temperatura?.maxima) ||
      (hourlyTemp ? Math.max(...hourlyTemp.map((e) => toNumber(e.value))) : 0),
    tempMin:
      toNumber(diaD?.temperatura?.minima) ||
      (hourlyTemp ? Math.min(...hourlyTemp.map((e) => toNumber(e.value))) : 0),
    precipitation: hourlyPrecip
      ? hourlyPrecip.reduce((acc, e) => acc + toNumber(e.value), 0)
      : 0,
    precipitationProbability: Math.max(
      maxOf(diaD?.probPrecipitacion as PeriodEntry[] | undefined),
      maxOf(diaH?.probPrecipitacion as PeriodEntry[] | undefined)
    ),
    weatherCode: 0,
    condition:
      diaD?.estadoCielo?.[0]?.descripcion || skyNow?.descripcion || undefined,
  };

  return { current, today, elaboratedAt, hasHourly: Boolean(hourly && diaH) };
}

// ---------------------------------------------------------------------------
// Avisos de fenómenos adversos (Meteoalerta / CAP)
// ---------------------------------------------------------------------------

const AVISOS_TTL_MS = 30 * 60 * 1000;

const avisosCache = new Map<
  string,
  { data: AemetAviso[]; expiresAt: number }
>();

/** Descarga el archivo de avisos (un tar con mensajes CAP XML). */
async function fetchAemetBinary(url: string, retries = 2): Promise<ArrayBuffer | null> {
  const key = process.env.AEMET_API_KEY || '';
  if (!key) return null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { api_key: key },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        throw new Error(`AEMET avisos HTTP ${res.status}`);
      }
      return await res.arrayBuffer();
    } catch (err) {
      if (attempt === retries - 1) {
        console.warn('[aemet] avisos: petición fallida:', url, err);
        return null;
      }
      await delay(1500 * (attempt + 1));
    }
  }
  return null;
}

interface TarFile {
  name: string;
  data: Uint8Array;
}

/** Lee un archivo tar sin comprimir (el formato que sirve AEMET). */
function readTar(buffer: ArrayBuffer): TarFile[] {
  const bytes = new Uint8Array(buffer);
  const files: TarFile[] = [];
  let offset = 0;

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    let name = '';
    for (const c of header.subarray(0, 100)) {
      if (c === 0) break;
      name += String.fromCharCode(c);
    }
    if (!name) break;

    const sizeStr = new TextDecoder('ascii')
      .decode(header.subarray(124, 136))
      .split('\0')[0]
      .trim();
    const size = parseInt(sizeStr || '0', 8);
    if (!Number.isFinite(size) || size < 0) break;

    files.push({ name, data: bytes.subarray(offset + 512, offset + 512 + size) });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

function xmlTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 's'));
  return m ? m[1].trim() : '';
}

function xmlValueAfter(xml: string, valueName: string): string {
  const m = xml.match(
    new RegExp(`<valueName>${valueName}</valueName>\\s*<value>(.*?)</value>`, 's')
  );
  return m ? m[1].trim() : '';
}

function parseCapAviso(xml: string): AemetAviso | null {
  const severity = xmlTag(xml, 'severity');
  if (severity !== 'Moderate' && severity !== 'Severe' && severity !== 'Extreme') {
    return null; // "Minor" = sin aviso
  }

  const nivel: AvisoNivel =
    severity === 'Extreme' ? 'rojo' : severity === 'Severe' ? 'naranja' : 'amarillo';
  const parametro = xmlValueAfter(xml, 'AEMET-Meteoalerta parametro');
  const [_, fenomenoRaw, valorRaw] = parametro.split(';');
  const fenomeno = fenomenoRaw?.trim() || xmlTag(xml, 'event').replace(/^Aviso de /i, '');
  const descripcion = xmlTag(xml, 'description') || xmlTag(xml, 'headline');

  return {
    nivel,
    fenomeno: fenomeno.charAt(0).toUpperCase() + fenomeno.slice(1),
    valor: valorRaw?.trim() ?? '',
    zona: xmlTag(xml, 'areaDesc'),
    inicio: xmlTag(xml, 'onset'),
    fin: xmlTag(xml, 'expires'),
    descripcion: descripcion.trim(),
  };
}

/**
 * Obtiene los avisos oficiales de fenómenos adversos de AEMET que afectan a
 * una zona concreta del Plan Meteoalerta (código de 6 dígitos, CCAA+provincia
 * +zona, p. ej. "611802" para Guadix y Baza). Devuelve [] si no hay avisos
 * activos o la API no está disponible.
 */
export async function getAemetAvisos(zoneCode: string): Promise<AemetAviso[]> {
  if (!/^\d{6}$/.test(zoneCode)) return [];
  const ccaa = zoneCode.slice(0, 2);
  const key = `zona:${zoneCode}`;

  const hit = avisosCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data;
  }

  const result: AemetAviso[] = [];
  try {
    const meta = (await fetchAsJson(
      `${BASE}/avisos_cap/ultimoelaborado/area/${ccaa}`,
      process.env.AEMET_API_KEY || '',
      12000
    )) as { datos?: string };
    const buffer = meta?.datos ? await fetchAemetBinary(meta.datos) : null;
    if (buffer) {
      for (const file of readTar(buffer)) {
        const m = file.name.match(/AFAZ(\d{6})/);
        // Solo los avisos de la zona Meteoalerta que cubre el municipio.
        if (!m || m[1] !== zoneCode) continue;
        const aviso = parseCapAviso(new TextDecoder('utf-8').decode(file.data));
        if (aviso) result.push(aviso);
      }
      result.sort((a, b) => a.inicio.localeCompare(b.inicio));
    }
  } catch (err) {
    console.warn('[aemet] avisos no disponibles:', err);
  }

  avisosCache.set(key, { data: result, expiresAt: Date.now() + AVISOS_TTL_MS });
  return result;
}
