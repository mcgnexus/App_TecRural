import { getAemetToday, getAemetAvisos } from './aemet';
import type { AemetAviso } from './aemet';

/** Localización mínima necesaria para consultar el tiempo. */
export interface WeatherLocation {
  name: string;
  lat: number;
  lon: number;
  aemet?: string;
  /** Código INE de provincia (p. ej. "18" para Granada): habilita los avisos
   *  oficiales de AEMET para la zona. */
  province?: string;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export type WeatherSource = 'aemet' | 'openmeteo' | 'hybrid' | 'mock';

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
  /** Descripción del estado del cielo (p. ej. "Poco nuboso" desde AEMET). */
  condition?: string;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  condition?: string;
  /** Evapotranspiración de referencia (ET0, FAO-56) en mm/día. */
  et0?: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
  precipitationProbability: number;
  /** Tipo de precipitación de Open-Meteo: 0 ninguno, 1 lluvia, 2 nieve,
   *  5 granizo. */
  precipitationType: number;
  weatherCode: number;
  isDay: boolean;
}

export interface WeatherData {
  source: WeatherSource;
  current: CurrentWeather;
  daily: DailyForecast[];
  /** Condiciones hora a hora (para elegir las mejores horas de riego). */
  hourly?: HourlyForecast[];
  /** Avisos oficiales de fenómenos adversos de AEMET (Meteoalerta) para la
   *  provincia. */
  avisos?: AemetAviso[];
  updatedAt: string;
}

const OPEN_METEO_URL =
  process.env.WEATHER_API_BASE || 'https://api.open-meteo.com/v1/forecast';

const CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheEntry {
  data: WeatherData;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function weatherCodeToLabel(code: number): string {
  if (code === 0) return 'Despejado';
  if (code <= 1) return 'Mayormente despejado';
  if (code === 2) return 'Parcialmente nublado';
  if (code === 3) return 'Nublado';
  if (code === 45 || code === 48) return 'Niebla';
  if (code >= 51 && code <= 57) return 'Llovizna';
  if (code >= 61 && code <= 67) return 'Lluvia';
  if (code >= 71 && code <= 77) return 'Nieve';
  if (code >= 80 && code <= 82) return 'Chubascos';
  if (code >= 95) return 'Tormenta';
  return 'Variable';
}

export { weatherCodeToLabel };

interface OpenMeteoCurrent {
  temperature_2m?: number;
  relative_humidity_2m?: number;
  apparent_temperature?: number;
  precipitation?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  wind_gusts_10m?: number;
  is_day?: number;
}

interface OpenMeteoDaily {
  time?: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_sum?: number[];
  precipitation_probability_max?: number[];
  weather_code?: number[];
  et0_fao_evapotranspiration?: number[];
}

interface OpenMeteoHourly {
  time?: string[];
  temperature_2m?: number[];
  relative_humidity_2m?: number[];
  wind_speed_10m?: number[];
  wind_gusts_10m?: number[];
  precipitation?: number[];
  precipitation_probability?: number[];
  precipitation_type?: number[];
  weather_code?: number[];
  is_day?: number[];
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
  daily?: OpenMeteoDaily;
  hourly?: OpenMeteoHourly;
}

interface OpenMeteoData {
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
}

function normalizeOpenMeteo(raw: OpenMeteoResponse): OpenMeteoData {
  const c = raw.current ?? {};
  const d = raw.daily ?? {};
  const h = raw.hourly ?? {};

  const daily: DailyForecast[] = (d.time ?? []).map((date, i) => ({
    date,
    tempMax: d.temperature_2m_max?.[i] ?? 0,
    tempMin: d.temperature_2m_min?.[i] ?? 0,
    precipitation: d.precipitation_sum?.[i] ?? 0,
    precipitationProbability: d.precipitation_probability_max?.[i] ?? 0,
    weatherCode: d.weather_code?.[i] ?? 0,
    et0: d.et0_fao_evapotranspiration?.[i],
  }));

  const hourly: HourlyForecast[] = (h.time ?? []).map((time, i) => ({
    time,
    temperature: h.temperature_2m?.[i] ?? 0,
    humidity: h.relative_humidity_2m?.[i] ?? 0,
    windSpeed: h.wind_speed_10m?.[i] ?? 0,
    windGusts: h.wind_gusts_10m?.[i] ?? 0,
    precipitation: h.precipitation?.[i] ?? 0,
    precipitationProbability: h.precipitation_probability?.[i] ?? 0,
    precipitationType: h.precipitation_type?.[i] ?? 0,
    weatherCode: h.weather_code?.[i] ?? 0,
    isDay: (h.is_day?.[i] ?? 1) === 1,
  }));

  return {
    current: {
      temperature: c.temperature_2m ?? 0,
      apparentTemperature: c.apparent_temperature ?? c.temperature_2m ?? 0,
      humidity: c.relative_humidity_2m ?? 0,
      windSpeed: c.wind_speed_10m ?? 0,
      windGusts: c.wind_gusts_10m ?? 0,
      precipitation: c.precipitation ?? 0,
      weatherCode: c.weather_code ?? 0,
      isDay: (c.is_day ?? 1) === 1,
    },
    daily,
    hourly,
  };
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<OpenMeteoData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration',
    hourly:
      'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,precipitation,precipitation_probability,precipitation_type,weather_code,is_day',
    timezone: 'auto',
    forecast_days: '3',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${OPEN_METEO_URL}?${params.toString()}`, {
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    if (!res.ok) {
      throw new Error(`Open-Meteo responded with ${res.status}`);
    }
    const raw = (await res.json()) as OpenMeteoResponse;
    if (!raw.current || !raw.daily?.time?.length) {
      throw new Error('Open-Meteo returned an empty payload');
    }
    return normalizeOpenMeteo(raw);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Datos de respaldo para cuando ninguna API meteorológica responde.
 * La app siempre puede funcionar con estos valores plausibles.
 */
function buildMock(lat: number): WeatherData {
  const isCoast = lat < 37;
  const now = new Date();

  const today: DailyForecast = {
    date: now.toISOString().slice(0, 10),
    tempMax: isCoast ? 30 : 27,
    tempMin: isCoast ? 20 : 13,
    precipitation: 0,
    precipitationProbability: 5,
    weatherCode: 2,
    et0: isCoast ? 5.2 : 4.2,
  };

  const tomorrow: DailyForecast = {
    date: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    tempMax: isCoast ? 31 : 28,
    tempMin: isCoast ? 21 : 14,
    precipitation: 0.2,
    precipitationProbability: 20,
    weatherCode: 3,
    et0: isCoast ? 5.4 : 4.4,
  };

  const tmin = today.tempMin;
  const tmax = today.tempMax;
  const hourly: HourlyForecast[] = Array.from({ length: 24 }, (_, h) => {
    // Curva de temperatura: mínima hacia las 5:00, máxima hacia las 15:00.
    const temp = tmeanSinusoidal(tmin, tmax, h);
    const windy = h >= 11 && h <= 18;
    return {
      time: `${today.date}T${String(h).padStart(2, '0')}:00`,
      temperature: temp,
      humidity: clamp(100 - (temp - tmin) * 3, 30, 90),
      windSpeed: windy ? 16 : 9,
      windGusts: windy ? 30 : 14,
      precipitation: 0,
      precipitationProbability: h >= 14 && h <= 18 ? 15 : 5,
      precipitationType: 0,
      weatherCode: h >= 14 && h <= 18 ? 3 : 2,
      isDay: h >= 7 && h <= 20,
    };
  });

  return {
    source: 'mock',
    current: {
      temperature: isCoast ? 29 : 26,
      apparentTemperature: isCoast ? 31 : 27,
      humidity: isCoast ? 48 : 35,
      windSpeed: isCoast ? 14 : 12,
      windGusts: 26,
      precipitation: 0,
      weatherCode: 2,
      isDay: true,
    },
    daily: [today, tomorrow],
    hourly,
    updatedAt: now.toISOString(),
  };
}

function tmeanSinusoidal(tmin: number, tmax: number, hour: number): number {
  // Mínima a las 5:00, máxima a las 15:00.
  const amp = (tmax - tmin) / 2;
  const mid = (tmax + tmin) / 2;
  const rad = ((hour - 5) / 20) * 2 * Math.PI;
  return mid - amp * Math.cos(rad);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Obtiene el tiempo para un municipio.
 *
 * Estrategia híbrida, usando cada fuente donde aporta más:
 *  - AEMET (predicción oficial por municipio): condiciones actuales y
 *    previsión de hoy, cuando la API responde.
 *  - Open-Meteo: columna vertebral fiable — previsión de los próximos días,
 *    mm de lluvia y respaldo cuando AEMET falla (p. ej. por límite de
 *    peticiones) o no está configurada.
 *  - Datos orientativos (mock): si ninguna API responde.
 */
export async function getWeather(location: WeatherLocation): Promise<WeatherData> {
  const key = location.name;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data;
  }

  const data = await fetchWeather(location);
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  const guarded = promise.catch(() => null);
  return Promise.race([
    guarded,
    new Promise<T | null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function fetchWeather(location: WeatherLocation): Promise<WeatherData> {
  const aemetKey = process.env.AEMET_API_KEY;

  // Open-Meteo y AEMET se piden en paralelo para no sumar latencia.
  const [om, aemet, avisosRaw] = await Promise.all([
    fetchOpenMeteo(location.lat, location.lon).catch(() => null),
    aemetKey && location.aemet
      ? withTimeout(getAemetToday(location.aemet), 9000).catch(() => null)
      : Promise.resolve(null),
    aemetKey && location.province
      ? withTimeout(getAemetAvisos(location.province), 12000).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);
  const avisos = avisosRaw ?? undefined;

  // Ninguna API respondió
  if (!om && !aemet) {
    console.warn('[weather] sin fuentes disponibles, usando datos orientativos');
    return buildMock(location.lat);
  }

  // Solo AEMET
  if (om === null && aemet) {
    return {
      source: 'aemet',
      current: aemet.current,
      daily: [aemet.today],
      avisos,
      updatedAt: aemet.elaboratedAt,
    };
  }

  // Solo Open-Meteo
  if (!aemet || om === null) {
    return {
      source: 'openmeteo',
      current: om!.current,
      daily: om!.daily,
      hourly: om!.hourly,
      avisos,
      updatedAt: new Date().toISOString(),
    };
  }

  // Híbrido: AEMET para hoy y condiciones actuales, Open-Meteo para la
  // tendencia y para lo que AEMET no aporta (mm de lluvia sin predicción
  // horaria).
  const today: DailyForecast = {
    ...aemet.today,
    tempMax: aemet.today.tempMax || om.daily[0]?.tempMax || aemet.today.tempMax,
    tempMin: aemet.today.tempMin || om.daily[0]?.tempMin || aemet.today.tempMin,
    precipitation: aemet.hasHourly
      ? aemet.today.precipitation
      : om.daily[0]?.precipitation ?? aemet.today.precipitation,
    precipitationProbability:
      aemet.today.precipitationProbability || om.daily[0]?.precipitationProbability || 0,
    et0: om.daily[0]?.et0 ?? aemet.today.et0,
  };

  return {
    source: 'hybrid',
    current: aemet.hasHourly ? aemet.current : om.current,
    daily: [today, ...om.daily.slice(1)],
    hourly: om.hourly,
    avisos,
    updatedAt: aemet.elaboratedAt,
  };
}

/** Fuerza una consulta sin caché (usado en pruebas). */
export function clearWeatherCache(): void {
  cache.clear();
}
