import type { CurrentWeather, DailyForecast } from './weather';

const BASE = 'https://opendata.aemet.es/opendata/api';

export interface AemetToday {
  current: CurrentWeather;
  today: DailyForecast;
  elaboratedAt: string;
  /** true si se obtuvo la predicción horaria (condiciones actuales fiables). */
  hasHourly: boolean;
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
async function fetchAemetJson(path: string, retries = 3): Promise<unknown | null> {
  const key = process.env.AEMET_API_KEY || '';
  if (!key) return null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const meta = (await fetchAsJson(`${BASE}/${path}`, key, 15000)) as {
        datos?: string;
      };
      if (!meta?.datos) {
        throw new Error('AEMET no devolvió enlace de datos');
      }
      await delay(500);
      return await fetchAsJson(meta.datos, key, 20000);
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
