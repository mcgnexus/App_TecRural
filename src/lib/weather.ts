import { getAemetToday } from './aemet';

/** Localización mínima necesaria para consultar el tiempo. */
export interface WeatherLocation {
  name: string;
  lat: number;
  lon: number;
  aemet?: string;
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
}

export interface WeatherData {
  source: WeatherSource;
  current: CurrentWeather;
  daily: DailyForecast[];
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
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
  daily?: OpenMeteoDaily;
}

interface OpenMeteoData {
  current: CurrentWeather;
  daily: DailyForecast[];
}

function normalizeOpenMeteo(raw: OpenMeteoResponse): OpenMeteoData {
  const c = raw.current ?? {};
  const d = raw.daily ?? {};

  const daily: DailyForecast[] = (d.time ?? []).map((date, i) => ({
    date,
    tempMax: d.temperature_2m_max?.[i] ?? 0,
    tempMin: d.temperature_2m_min?.[i] ?? 0,
    precipitation: d.precipitation_sum?.[i] ?? 0,
    precipitationProbability: d.precipitation_probability_max?.[i] ?? 0,
    weatherCode: d.weather_code?.[i] ?? 0,
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
  };
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<OpenMeteoData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
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
  };

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
    updatedAt: now.toISOString(),
  };
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
  return Promise.race([
    promise,
    new Promise<T | null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function fetchWeather(location: WeatherLocation): Promise<WeatherData> {
  const aemetKey = process.env.AEMET_API_KEY;

  // Open-Meteo y AEMET se piden en paralelo para no sumar latencia.
  const [om, aemet] = await Promise.all([
    fetchOpenMeteo(location.lat, location.lon).catch(() => null),
    aemetKey && location.aemet
      ? withTimeout(getAemetToday(location.aemet), 9000)
      : Promise.resolve(null),
  ]);

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
      updatedAt: aemet.elaboratedAt,
    };
  }

  // Solo Open-Meteo
  if (!aemet || om === null) {
    return {
      source: 'openmeteo',
      current: om!.current,
      daily: om!.daily,
      updatedAt: new Date().toISOString(),
    };
  }

  // Híbrido: AEMET para hoy y condiciones actuales, Open-Meteo para la
  // tendencia y para lo que AEMET no aporta (mm de lluvia sin predicción
  // horaria).
  const today: DailyForecast = {
    ...aemet.today,
    precipitation: aemet.hasHourly
      ? aemet.today.precipitation
      : om.daily[0]?.precipitation ?? aemet.today.precipitation,
    precipitationProbability:
      aemet.today.precipitationProbability || om.daily[0]?.precipitationProbability || 0,
  };

  return {
    source: 'hybrid',
    current: aemet.hasHourly ? aemet.current : om.current,
    daily: [today, ...om.daily.slice(1)],
    updatedAt: aemet.elaboratedAt,
  };
}

/** Fuerza una consulta sin caché (usado en pruebas). */
export function clearWeatherCache(): void {
  cache.clear();
}
