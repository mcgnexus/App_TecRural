/** Coeficiente de cultivo (Kc) según FAO-56 para las tres etapas clave. */
export interface CropKc {
  /** Etapa inicial (brotación/plantación). */
  ini: number;
  /** Plena producción / máxima demanda. */
  mid: number;
  /** Final / maduración. */
  end: number;
}

export interface Crop {
  value: string;
  label: string;
  /** Necesidad orientativa de agua: ayuda a ajustar la recomendación de riego. */
  waterNeed: 'low' | 'medium' | 'high';
  /** Coeficiente de cultivo FAO-56 (valores orientativos). */
  kc: CropKc;
}

/**
 * Kc de la tabla 12 del manual FAO-56 (cultivo sobre suelo desnudo, sin
 * cubierta vegetal). Valores orientativos; la práctica local puede variar.
 */
export const CROPS: Crop[] = [
  { value: 'olivar', label: 'Olivar', waterNeed: 'low', kc: { ini: 0.5, mid: 0.7, end: 0.7 } },
  { value: 'almendro', label: 'Almendro', waterNeed: 'low', kc: { ini: 0.4, mid: 0.9, end: 0.65 } },
  { value: 'pistacho', label: 'Pistacho', waterNeed: 'low', kc: { ini: 0.4, mid: 0.9, end: 0.45 } },
  { value: 'horticolas', label: 'Hortícolas', waterNeed: 'high', kc: { ini: 0.6, mid: 1.05, end: 0.85 } },
  { value: 'aguacate', label: 'Aguacate', waterNeed: 'high', kc: { ini: 0.6, mid: 0.85, end: 0.75 } },
  { value: 'chirimoyo', label: 'Chirimoyo', waterNeed: 'high', kc: { ini: 0.55, mid: 0.85, end: 0.75 } },
  { value: 'mango', label: 'Mango', waterNeed: 'high', kc: { ini: 0.45, mid: 0.8, end: 0.7 } },
  { value: 'vinedo', label: 'Viñedo', waterNeed: 'medium', kc: { ini: 0.3, mid: 0.8, end: 0.45 } },
  { value: 'otros', label: 'Otros', waterNeed: 'medium', kc: { ini: 0.5, mid: 0.9, end: 0.7 } },
];

export function findCrop(value: string): Crop | undefined {
  return CROPS.find((c) => c.value === value);
}

/** Etapas de crecimiento del cultivo (fenología). */
export interface CropStage {
  value: string;
  label: string;
  hint: string;
}

export const CROP_STAGES: CropStage[] = [
  {
    value: 'inicio',
    label: 'Inicio / brotación',
    hint: 'Brotes y hojas nuevas; la planta gasta poca agua.',
  },
  {
    value: 'desarrollo',
    label: 'Desarrollo / crecimiento',
    hint: 'Crecimiento activo; la demanda de agua va subiendo.',
  },
  {
    value: 'plena',
    label: 'Plena producción',
    hint: 'Máxima demanda de agua (cuajado y engorde del fruto).',
  },
  {
    value: 'madurez',
    label: 'Maduración / final',
    hint: 'Fruto madurando o reposo; demanda de agua menor.',
  },
];

export type CropStageValue = (typeof CROP_STAGES)[number]['value'];

/** Kc aproximado según la etapa fenológica (la curva crece entre ini y mid). */
export function kcForStage(crop: Crop, stage: CropStageValue): number {
  switch (stage) {
    case 'inicio':
      return crop.kc.ini;
    case 'desarrollo':
      return (crop.kc.ini + crop.kc.mid) / 2;
    case 'madurez':
      return crop.kc.end;
    case 'plena':
    default:
      return crop.kc.mid;
  }
}

export const FARM_SIZES = [
  { value: 'menos-1', label: 'Menos de 1 ha' },
  { value: '1-5', label: 'Entre 1 y 5 ha' },
  { value: '5-20', label: 'Entre 5 y 20 ha' },
  { value: 'mas-20', label: 'Más de 20 ha' },
  { value: 'nsnc', label: 'Prefiero no decirlo' },
] as const;

export const PROBLEMS = [
  { value: 'riego', label: 'Riego' },
  { value: 'plagas', label: 'Plagas o enfermedades' },
  { value: 'clima', label: 'Clima (heladas, calor, viento)' },
  { value: 'sensores', label: 'Sensores o datos de la finca' },
  { value: 'automatizacion', label: 'Automatización' },
  { value: 'otro', label: 'Otro' },
] as const;
