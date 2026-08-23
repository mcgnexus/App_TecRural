import type { WeatherData, HourlyForecast } from './weather';
import type { Crop } from './crops';
import { kcForStage, type CropStageValue } from './crops';

/** 1 mm de agua sobre 1 ha equivale a 10.000 litros. */
const LITERS_PER_HA_MM = 10_000;

/** Parte de la lluvia prevista que se aprovecha (resto escurre o se pierde). */
const RAIN_EFFICIENCY = 0.7;

export interface BestHours {
  /** Ventana de mañana recomendada, p. ej. "5:00–9:00" o null. */
  morning: string | null;
  /** Ventana de tarde/noche recomendada, p. ej. "19:00–22:00" o null. */
  evening: string | null;
  /** Mejor hora suelta del día, p. ej. "07:00". */
  best: string;
  /** Motivos breves de la elección. */
  reasons: string[];
}

export interface IrrigationAdvice {
  et0: number;
  kc: number;
  /** Evapotranspiración del cultivo hoy (ET0 × Kc) en mm. */
  etc: number;
  /** Lluvia prevista aprovechable (hoy + parte de mañana) en mm. */
  rain: number;
  /** Agua neta que necesita el suelo (etc − lluvia aprovechable) en mm. */
  netMm: number;
  litersPerHa: number;
  liters: number;
  hectares: number;
  cropLabel: string;
  stageLabel: string;
  hours: BestHours;
  /** true cuando la lluvia prevista ya cubre la necesidad del cultivo. */
  coveredByRain: boolean;
  note: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * ET0 de referencia del día (FAO-56). Usa el valor que aporta Open-Meteo
 * (`et0_fao_evapotranspiration`) y, si no está disponible, una aproximación
 * tipo Hargreaves a partir de temperaturas.
 */
export function et0Of(weather: WeatherData): number {
  const et0 = weather.daily[0]?.et0;
  if (et0 && et0 > 0) return et0;

  const current = weather.current;
  const tmax = weather.daily[0]?.tempMax ?? current.temperature;
  const tmin = weather.daily[0]?.tempMin ?? Math.max(0, current.temperature - 10);
  const tmean = (tmax + tmin) / 2;
  // Radiación extraterrestre media (MJ/m²/día) para ~37°N según el mes.
  const ra =
    [19, 23, 28, 33, 36, 38, 37, 34, 29, 23, 19, 16][new Date().getMonth()] ?? 25;
  const estimate = 0.0023 * ra * Math.sqrt(Math.max(0.5, tmax - tmin)) * (tmean + 17.8);
  return clamp(estimate, 1, 9);
}

// ---------------------------------------------------------------------------
// Mejores horas de riego
// ---------------------------------------------------------------------------

interface HourPoint {
  hour: number;
  label: string;
  temp: number;
  wind: number;
  precip: number;
  prob: number;
}

function pointsFromHourly(hourly: HourlyForecast[]): HourPoint[] {
  return hourly.map((h) => ({
    hour: Number(h.time.slice(11, 13)),
    label: h.time.slice(11, 16),
    temp: h.temperature,
    wind: h.windSpeed,
    precip: h.precipitation,
    prob: h.precipitationProbability,
  }));
}

/**
 * Puntuación de una hora para regar. Prefiere las primeras horas de la
 * mañana y el atardecer, y penaliza calor extremo, viento y lluvia.
 */
function scoreHour(p: HourPoint): number {
  let s = 0;
  const h = p.hour;
  if (h >= 5 && h <= 9) s += 30;
  else if (h >= 18 && h <= 22) s += 28;
  else if ((h >= 10 && h <= 11) || (h >= 16 && h <= 17)) s += 10;
  else if (h >= 12 && h <= 15) s -= 25;
  else s -= 8; // noche

  if (p.temp >= 32) s -= 30;
  else if (p.temp >= 28) s -= 15;
  else if (p.temp <= 22) s += 5;

  if (p.wind >= 25) s -= 30;
  else if (p.wind >= 15) s -= 12;
  else if (p.wind <= 8) s += 5;

  if (p.precip > 0.3) s -= 40;
  else if (p.precip > 0.1) s -= 15;
  if (p.prob >= 70) s -= 25;
  else if (p.prob >= 50) s -= 12;

  return s;
}

function windowMean(points: HourPoint[], start: number, end: number): number | null {
  const inWindow = points.filter((p) => p.hour >= start && p.hour <= end);
  if (!inWindow.length) return null;
  return inWindow.reduce((acc, p) => acc + scoreHour(p), 0) / inWindow.length;
}

function mean<T>(values: T[], pick: (v: T) => number): number | null {
  if (!values.length) return null;
  return values.reduce((acc, v) => acc + pick(v), 0) / values.length;
}

export function bestIrrigationHours(weather: WeatherData): BestHours {
  const morning = { start: 5, end: 9, label: '5:00–9:00' };
  const evening = { start: 18, end: 22, label: '18:00–22:00' };

  const reasons: string[] = [];

  if (weather.hourly?.length) {
    const points = pointsFromHourly(weather.hourly);

    const morningScore = windowMean(points, morning.start, morning.end);
    const eveningScore = windowMean(points, evening.start, evening.end);
    const showMorning = morningScore !== null && morningScore >= 12;
    const showEvening = eveningScore !== null && eveningScore >= 12;

    const sorted = [...points].sort(
      (a, b) => scoreHour(b) - scoreHour(a) || a.hour - b.hour
    );
    const best = sorted[0];

    const midday = points.filter((p) => p.hour >= 12 && p.hour <= 16);
    const middayTemp = mean(midday, (p) => p.temp);
    if (middayTemp !== null && middayTemp >= 30) {
      reasons.push(
        `A mediodía el calor es alto (hasta ${Math.round(middayTemp)} °C) y el agua se evapora mucho más.`
      );
    }

    const bestWindowWind = mean(
      points.filter((p) => (p.hour >= morning.start && p.hour <= morning.end) || (p.hour >= evening.start && p.hour <= evening.end)),
      (p) => p.wind
    );
    if (bestWindowWind !== null && bestWindowWind <= 12) {
      reasons.push(
        `A esas horas el viento es flojo (${Math.round(bestWindowWind)} km/h) y el riego no se desvía.`
      );
    }

    const rainHour = points.find((p) => p.precip > 0.5 || p.prob >= 70);
    if (rainHour) {
      reasons.push(
        `Hay lluvia prevista a las ${rainHour.label} · evita regar justo antes o durante la lluvia.`
      );
    }

    return {
      morning: showMorning ? morning.label : null,
      evening: showEvening ? evening.label : null,
      best: best.label,
      reasons,
    };
  }

  // Sin datos horarios: recomendación general basada en el estado actual.
  const hot = weather.current.temperature >= 28;
  const windy = weather.current.windSpeed >= 15;
  reasons.push('Sin datos hora a hora, se recomienda regar en las horas suaves del día.');
  if (hot) reasons.push('Hace calor: evita el mediodía por evaporación.');
  if (windy) reasons.push('Hay viento: usa riego por goteo o localizado.');
  return {
    morning: '5:00–9:00',
    evening: hot ? '19:00–22:00' : null,
    best: '07:00',
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Cálculo de la cantidad de agua
// ---------------------------------------------------------------------------

export function computeIrrigation(
  weather: WeatherData,
  crop: Crop,
  stage: CropStageValue,
  hectares: number
): IrrigationAdvice {
  const safeHa = Number.isFinite(hectares) && hectares > 0 ? hectares : 1;
  const et0 = et0Of(weather);
  const kc = kcForStage(crop, stage);
  const etc = et0 * kc;

  const rainToday = weather.daily[0]?.precipitation ?? 0;
  const rainTomorrow = weather.daily[1]?.precipitation ?? 0;
  const rain = rainToday + rainTomorrow * 0.5;
  const effectiveRain = Math.min(rain, etc) * RAIN_EFFICIENCY;

  const netMm = Math.max(0, etc - effectiveRain);
  const coveredByRain = netMm < 0.2;

  const litersPerHa = Math.round((netMm * LITERS_PER_HA_MM) / 100) * 100;
  const liters = litersPerHa * safeHa;

  const hours = bestIrrigationHours(weather);

  const stageLabel =
    stage === 'inicio'
      ? 'Inicio / brotación'
      : stage === 'desarrollo'
        ? 'Desarrollo / crecimiento'
        : stage === 'madurez'
          ? 'Maduración / final'
          : 'Plena producción';

  const maxWind = Math.max(
    weather.current.windSpeed,
    ...(weather.hourly ?? []).map((hour) => hour.windSpeed),
    ...(weather.hourly ?? []).map((hour) => hour.windGusts)
  );
  const tmax = Math.max(
    weather.current.temperature,
    weather.daily[0]?.tempMax ?? weather.current.temperature
  );
  const dryConditions = et0 >= 6 || tmax >= 30 || weather.current.humidity <= 40;
  const windyConditions = maxWind >= 25;

  const note = coveredByRain
    ? 'La lluvia prevista cubre buena parte de la necesidad. Comprueba el suelo antes de regar por si la lluvia no ha calado lo suficiente.'
    : dryConditions && windyConditions
      ? 'Hoy el suelo puede perder humedad rápidamente. Comprueba la humedad a 10–20 cm y evita regar por aspersión si hay viento.'
      : dryConditions
        ? 'Hoy el suelo puede perder humedad rápidamente. Comprueba la humedad a 10–20 cm antes de regar.'
        : windyConditions
          ? 'Hay viento previsto. Comprueba la humedad a 10–20 cm y evita regar por aspersión en las horas ventosas.'
          : 'Antes de regar, comprueba la humedad del suelo a 10–20 cm y ajusta la cantidad a lo que observes en la parcela.';

  return {
    et0,
    kc,
    etc,
    rain: effectiveRain,
    netMm,
    litersPerHa,
    liters,
    hectares: safeHa,
    cropLabel: crop.label,
    stageLabel,
    hours,
    coveredByRain,
    note,
  };
}

/** Formatea litros con separador de miles (es-ES). */
export function formatLitros(litros: number): string {
  return Math.round(litros).toLocaleString('es-ES');
}
