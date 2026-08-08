export type RiskLevel = 'low' | 'medium' | 'high';

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
}

export interface WeatherData {
  source: 'live' | 'mock';
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

function normalize(raw: OpenMeteoResponse, updatedAt: string): WeatherData {
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
    source: 'live',
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
    updatedAt,
  };
}

/**
 * Datos de respaldo para cuando la API meteorológica no responde.
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

async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherData> {
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
    return normalize(raw, new Date().toISOString());
  } finally {
    clearTimeout(timer);
  }
}

export async function getWeather(
  lat: number,
  lon: number
): Promise<WeatherData> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data;
  }

  try {
    const data = await fetchOpenMeteo(lat, lon);
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (err) {
    console.warn('[weather] fallback a datos de respaldo:', err);
    const data = buildMock(lat);
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }
}
