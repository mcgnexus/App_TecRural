import type { RiskLevel } from './weather';
import type { WeatherData } from './weather';
import type { Crop } from './crops';

export interface Risk {
  level: RiskLevel;
  label: string;
  /** Breve explicación pensada para agricultores. */
  hint: string;
}

export interface Risks {
  heat: Risk;
  wind: Risk;
  dryness: Risk;
}

export type RecommendationLevel =
  | 'no-need'
  | 'check-soil'
  | 'water'
  | 'avoid-wind'
  | 'avoid-heat';

export interface Recommendation {
  level: RecommendationLevel;
  title: string;
  message: string;
  advice: string;
}

function levelOf(value: number, low: number, high: number): RiskLevel {
  if (value >= high) return 'high';
  if (value >= low) return 'medium';
  return 'low';
}

export function computeRisks(weather: WeatherData): Risks {
  const { current, daily } = weather;
  const today = daily[0];

  const peakTemp = Math.max(current.temperature, today?.tempMax ?? current.temperature);
  const heatLevel = levelOf(peakTemp, 30, 34);

  const windLevel = levelOf(current.windSpeed, 20, 35);

  const rainToday = today?.precipitation ?? 0;
  const rainTomorrow = daily[1]?.precipitation ?? 0;
  const drynessLevel =
    current.humidity <= 40 && rainToday + rainTomorrow < 3
      ? 'high'
      : current.humidity <= 55 && rainToday + rainTomorrow < 3
        ? 'medium'
        : 'low';

  return {
    heat: {
      level: heatLevel,
      label: 'Riesgo de calor',
      hint:
        heatLevel === 'high'
          ? 'Temperatura muy alta. El agua se evapora rápido y las plantas sufren estrés térmico.'
          : heatLevel === 'medium'
            ? 'Calor notable. Conviene regar en horas suaves.'
            : 'Temperaturas suaves. Sin riesgo de calor.',
    },
    wind: {
      level: windLevel,
      label: 'Riesgo de viento',
      hint:
        windLevel === 'high'
          ? 'Viento fuerte. El riego pierde eficacia y el agua se evapora o se desvía.'
          : windLevel === 'medium'
            ? 'Viento moderado. Evita el riego por aspersión en horas ventosas.'
            : 'Viento flojo. Sin riesgo por viento.',
    },
    dryness: {
      level: drynessLevel,
      label: 'Riesgo de sequedad',
      hint:
        drynessLevel === 'high'
          ? 'Aire muy seco y poca lluvia a la vista. El suelo pierde humedad con facilidad.'
          : drynessLevel === 'medium'
            ? 'Aire seco. Comprueba la humedad del suelo antes de decidir.'
            : 'Humedad aceptable o lluvia a la vista. Sin sequedad destacada.',
    },
  };
}

export function getRecommendation(
  weather: WeatherData,
  crop?: Crop
): Recommendation {
  const risks = computeRisks(weather);
  const { current, daily } = weather;
  const today = daily[0];
  const tomorrow = daily[1];

  const rain = (today?.precipitation ?? 0) + (tomorrow?.precipitation ?? 0);
  const highWaterCrop = crop?.waterNeed === 'high';

  // 1) Evitar riego por condiciones extremas
  if (risks.wind.level === 'high' || risks.heat.level === 'high') {
    const parts: string[] = [];
    if (risks.heat.level === 'high') {
      parts.push('el calor es extremo');
    }
    if (risks.wind.level === 'high') {
      parts.push('hay viento fuerte');
    }
    const msg =
      parts.length === 2
        ? 'El calor extremo y el viento fuerte hacen que el riego pierda eficacia: gran parte del agua se evapora antes de llegar a la planta.'
        : parts[0] === 'el calor es extremo'
          ? 'Con este calor, regar a mediodía puede quemar el cultivo y desperdiciar agua por evaporación.'
          : 'Con viento fuerte el agua se desvía y se evapora, y se moja mal la parcela.';

    const heatFirst = risks.heat.level === 'high';
    return {
      level: heatFirst ? 'avoid-heat' : 'avoid-wind',
      title: 'Evitar riego por viento/calor extremo',
      message: msg,
      advice: heatFirst
        ? 'Si es imprescindible, riega a primera hora de la mañana o al atardecer, y con riego por goteo si lo tienes.'
        : 'Espera a que amaine el viento o riega muy temprano con riego localizado (goteo).',
    };
  }

  // 2) Lluvia prevista suficiente
  if (rain >= 10) {
    return {
      level: 'no-need',
      title: 'No parece necesario regar hoy',
      message: `Hay ${rain.toFixed(1)} mm de lluvia prevista entre hoy y mañana. Esa agua debería cubrir buena parte de las necesidades del cultivo.`,
      advice: 'Aprovecha para revisar el riego (goteros, filtros y programador) y anota la previsión de los próximos días.',
    };
  }

  // 3) Situación seca
  if (risks.dryness.level === 'high') {
    return {
      level: 'water',
      title: 'Riego recomendado si el suelo está seco',
      message: highWaterCrop
        ? `El aire está muy seco y tu cultivo (${crop?.label.toLowerCase()}) tiene bastante demanda de agua. Sin lluvia a la vista, conviene asegurar el riego.`
        : 'El aire está muy seco y sin lluvia a la vista. Si el suelo está seco, hoy conviene regar.',
      advice: 'Antes de regar, comprueba la humedad del suelo a unos 10-20 cm de profundidad. Si está seco, aplica un riego bien repartido.',
    };
  }

  // 4) Situación intermedia
  if (risks.dryness.level === 'medium' && current.temperature >= 28) {
    return {
      level: 'check-soil',
      title: 'Conviene revisar humedad del suelo',
      message: `Hace calor y el aire está seco. Tu cultivo (${crop?.label.toLowerCase()}) empieza a necesitar agua, pero no hay urgencia clara.`,
      advice: 'Mira si el suelo está húmedo a 10-20 cm de profundidad. Si está seco, riega; si aún conserva humedad, puedes esperar.',
    };
  }

  return {
    level: 'check-soil',
    title: 'Conviene revisar humedad del suelo',
    message: `Las condiciones de hoy no son extremas y hay algo de humedad o lluvia a la vista (${rain.toFixed(1)} mm previstos). No hay urgencia por regar.`,
    advice: 'Comprueba la humedad del suelo y el estado del cultivo antes de decidir. Si el suelo sigue húmedo, hoy no es necesario regar.',
  };
}
