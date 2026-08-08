import type { WeatherData } from './weather';
import type { AemetAviso, AvisoNivel } from './aemet';
import type { Crop } from './crops';
import { et0Of } from './irrigation';

export type AlarmLevel = 'info' | 'warning' | 'alert';

export type AlarmKind =
  | 'calor'
  | 'helada'
  | 'frio'
  | 'tormenta'
  | 'granizo'
  | 'viento'
  | 'lluvia'
  | 'sequia'
  | 'aviso';

export interface Alarm {
  kind: AlarmKind;
  level: AlarmLevel;
  title: string;
  message: string;
  advice: string;
  /** Hora aproximada del fenómeno (p. ej. "03:00"), cuando se conoce. */
  at?: string;
}

export interface AlarmOptions {
  crop?: Crop;
  locationName?: string;
}

/** Nivel de alarma que corresponde a cada nivel de aviso oficial de AEMET. */
export const AVISO_LEVEL: Record<AvisoNivel, AlarmLevel> = {
  amarillo: 'warning',
  naranja: 'alert',
  rojo: 'alert',
};

const AVISO_ADVICE: Record<AvisoNivel, string> = {
  amarillo:
    'Esté atento: algunas actividades al aire libre pueden verse alteradas. Revisa la previsión de las próximas horas.',
  naranja:
    'Esté preparado y tome precauciones: las actividades habituales pueden verse alteradas. Asegura el material y evita riesgos.',
  rojo:
    'Tome medidas preventivas y siga las indicaciones de las autoridades. Evita actividades al aire libre si no es imprescindible.',
};

/** Formatea un instante ISO (con zona horaria) como "HH:MM". */
function horaDe(iso: string): string {
  return iso.slice(11, 16);
}

/** Cultivos tropicales/subtropicales muy sensibles al frío y la helada. */
const FROST_SENSITIVE = new Set(['aguacate', 'chirimoyo', 'mango']);

const SEVERITY_ORDER: Record<AlarmLevel, number> = { alert: 0, warning: 1, info: 2 };

function hourOf(time: string): string {
  return time.slice(11, 16);
}

function cropName(crop?: Crop): string {
  return crop ? crop.label.toLowerCase() : 'tu cultivo';
}

function maxOf(values: number[]): number {
  return values.length ? Math.max(...values) : 0;
}

/**
 * Detecta alarmas meteorológicas para la zona a partir de la previsión.
 * Niveles: alert (urgente), warning (atención) e info (aviso suave).
 */
export function computeAlarms(weather: WeatherData, opts: AlarmOptions = {}): Alarm[] {
  const alarms: Alarm[] = [];
  const crop = opts.crop;
  const sensitive = crop ? FROST_SENSITIVE.has(crop.value) : false;
  const name = cropName(crop);

  const current = weather.current;
  const today = weather.daily[0];
  const tomorrow = weather.daily[1];

  const tmax = Math.max(
    today?.tempMax ?? current.temperature,
    tomorrow?.tempMax ?? Number.NEGATIVE_INFINITY
  );
  const tmin = Math.min(
    today?.tempMin ?? current.temperature - 10,
    tomorrow?.tempMin ?? Number.POSITIVE_INFINITY
  );
  const et0 = et0Of(weather);
  const humidity = current.humidity;

  // --- Calor ---
  if (tmax >= 38) {
    alarms.push({
      kind: 'calor',
      level: 'alert',
      title: 'Calor extremo',
      message: `Se esperan hasta ${Math.round(tmax)} °C. El calor fuerte quema y aumenta mucho el gasto de agua del ${name}.`,
      advice: 'Riega a primera hora de la mañana o al atardecer, nunca a mediodía. Baja la presión del riego y, si puedes, da algo de sombra a las plantas jóvenes.',
    });
  } else if (tmax >= 34) {
    alarms.push({
      kind: 'calor',
      level: 'warning',
      title: 'Calor intenso',
      message: `Se esperan ${Math.round(tmax)} °C. Con estas temperaturas el agua se evapora deprisa.`,
      advice: 'Evita regar en las horas centrales. Si el suelo está seco, riega temprano con riego localizado.',
    });
  }

  // --- Helada ---
  const frostAlert = sensitive ? 2 : 0;
  const frostWarn = sensitive ? 4 : 2;
  if (tmin <= frostAlert) {
    alarms.push({
      kind: 'helada',
      level: 'alert',
      title: 'Riesgo de helada',
      message: `La mínima prevista es de ${Math.round(tmin)} °C${sensitive ? ' (tu cultivo es muy sensible al hielo)' : ''}. La helada puede dañar brotes y frutos.`,
      advice: 'Protege los cultivos sensibles (mallas, acolchado) y retrasa la poda. Vigila la madrugada y no riegues por aspersión durante la helada.',
    });
  } else if (tmin <= frostWarn) {
    alarms.push({
      kind: 'helada',
      level: 'warning',
      title: 'Helada débil posible',
      message: `La mínima prevista es de ${Math.round(tmin)} °C: puede haber helada ligera o escarcha.`,
      advice: `Vigila las ${name} jóvenes y retrasa el riego de madrugada si hay escarcha. Protégete con malla si es un cultivo sensible.`,
    });
  }

  // --- Frío (sin llegar a helada) ---
  const coldWarn = sensitive ? 7 : 5;
  if (tmin > frostWarn && tmin <= coldWarn) {
    alarms.push({
      kind: 'frio',
      level: 'warning',
      title: 'Temperaturas frías',
      message: `La mínima prevista es de ${Math.round(tmin)} °C: noche fría${sensitive ? ', y tu cultivo tolera mal el frío' : ''}.`,
      advice: 'Reduce el riego si el suelo sigue húmedo y evita podas fuertes hasta que pase el frío.',
    });
  }

  // --- Tormenta ---
  const stormDay = weather.daily.some((d) => d.weatherCode >= 95);
  const stormHour = weather.hourly?.find((h) => h.weatherCode >= 95);
  if (stormDay || stormHour) {
    const at = stormHour ? hourOf(stormHour.time) : undefined;
    const hail = stormHour && (stormHour.weatherCode === 96 || stormHour.weatherCode === 99);
    alarms.push({
      kind: 'tormenta',
      level: stormDay ? 'alert' : 'warning',
      title: 'Tormentas',
      message: at
        ? `Tormenta prevista alrededor de las ${at}${hail ? ', y puede ir acompañada de granizo' : ''}. Los chubascos fuertes pueden encharcar y dañar el cultivo.`
        : 'Previsión de tormentas en tu zona. Los chubascos fuertes pueden encharcar y dañar el cultivo.',
      advice: 'Asegura objetos sueltos y canalizaciones, y evita regar antes o durante la lluvia fuerte. Si riegas, usa goteo.',
      at,
    });
  }

  // --- Granizo ---
  const hailHour = weather.hourly?.find((h) => h.precipitationType >= 5);
  if (hailHour) {
    alarms.push({
      kind: 'granizo',
      level: 'alert',
      title: 'Granizo posible',
      message: `Se prevé granizo hacia las ${hourOf(hailHour.time)}. El pedrisco puede dañar hojas y frutos.`,
      advice: 'Si tienes mallas antigranizo, cierra las superficies vulnerables. Evita trabajos en el campo durante el episodio.',
      at: hourOf(hailHour.time),
    });
  }

  // --- Avisos oficiales de AEMET (Meteoalerta) ---
  for (const aviso of weather.avisos ?? []) {
    const level = AVISO_LEVEL[aviso.nivel];
    alarms.push({
      kind: 'aviso',
      level,
      title: `Aviso oficial: ${aviso.fenomeno}`,
      message: `${aviso.nivel.charAt(0).toUpperCase() + aviso.nivel.slice(1)} en ${aviso.zona}${
        aviso.valor ? ` (${aviso.valor})` : ''
      }${aviso.inicio ? ` desde las ${horaDe(aviso.inicio)}` : ''}${
        aviso.fin ? ` hasta las ${horaDe(aviso.fin)}` : ''
      }.`,
      advice: AVISO_ADVICE[aviso.nivel],
      at: aviso.inicio ? horaDe(aviso.inicio) : undefined,
    });
  }

  // --- Viento ---
  const maxGust = maxOf([
    current.windGusts,
    ...(weather.hourly ?? []).map((h) => h.windGusts),
  ]);
  const maxWind = maxOf([
    current.windSpeed,
    ...(weather.hourly ?? []).map((h) => h.windSpeed),
  ]);
  const gustHour = weather.hourly?.find((h) => h.windGusts === maxGust);
  if (maxGust >= 60 || maxWind >= 40) {
    alarms.push({
      kind: 'viento',
      level: 'alert',
      title: 'Viento muy fuerte',
      message: `Se prevén rachas de hasta ${Math.round(maxGust)} km/h${gustHour ? ` hacia las ${hourOf(gustHour.time)}` : ''}. El viento tumba ramas y desvía el riego.`,
      advice: 'No riegues por aspersión; usa goteo. Revisa tutores, mallas y estructuras ligeras.',
      at: gustHour ? hourOf(gustHour.time) : undefined,
    });
  } else if (maxGust >= 40 || maxWind >= 28) {
    alarms.push({
      kind: 'viento',
      level: 'warning',
      title: 'Viento fuerte',
      message: `Rachas de hasta ${Math.round(maxGust)} km/h. El riego por aspersión pierde eficacia.`,
      advice: 'Prefiere el riego por goteo y evita regar en las horas de más viento.',
      at: gustHour ? hourOf(gustHour.time) : undefined,
    });
  }

  // --- Lluvia intensa ---
  const maxDayRain = maxOf(weather.daily.map((d) => d.precipitation));
  const maxHourRain = maxOf((weather.hourly ?? []).map((h) => h.precipitation));
  if (maxDayRain >= 25 || maxHourRain >= 8) {
    alarms.push({
      kind: 'lluvia',
      level: 'alert',
      title: 'Lluvia fuerte',
      message: `Se prevén ${maxDayRain.toFixed(1)} mm${maxHourRain >= 8 ? ' con horas de mucha agua' : ''}. Riesgo de encharcamiento y escorrentía.`,
      advice: 'Retrasa el riego y el abonado hasta que amaine. Revisa drenajes y zanjas.',
    });
  } else if (maxDayRain >= 15 || maxHourRain >= 4) {
    alarms.push({
      kind: 'lluvia',
      level: 'warning',
      title: 'Lluvia notable',
      message: `Se prevén ${maxDayRain.toFixed(1)} mm de lluvia. Puede cubrir buena parte del riego de hoy.`,
      advice: 'Si el suelo está húmedo, hoy no hace falta regar tanto; aprovecha el agua de la lluvia.',
    });
  }

  // --- Sequía ---
  const rainSum = weather.daily.reduce((acc, d) => acc + d.precipitation, 0);
  const dry = rainSum < 2 && (et0 >= 6 || (tmax >= 32 && humidity <= 40));
  if (dry) {
    const severe = rainSum < 1 && et0 >= 7;
    alarms.push({
      kind: 'sequia',
      level: severe ? 'alert' : 'warning',
      title: 'Sequía y demanda alta de agua',
      message: `Sin lluvia a la vista (${rainSum.toFixed(1)} mm) y demanda de agua alta (ET0 ${et0.toFixed(1)} mm/día). El suelo se seca con rapidez.`,
      advice: 'Revisa el riego y prioriza las plantas jóvenes. Usa acolchado o cubierta para conservar la humedad y evita pérdidas por evaporación.',
    });
  }

  alarms.sort((a, b) => SEVERITY_ORDER[a.level] - SEVERITY_ORDER[b.level]);
  return alarms;
}
