export interface Crop {
  value: string;
  label: string;
  /** Necesidad orientativa de agua: ayuda a ajustar la recomendación de riego. */
  waterNeed: 'low' | 'medium' | 'high';
}

export const CROPS: Crop[] = [
  { value: 'olivar', label: 'Olivar', waterNeed: 'low' },
  { value: 'almendro', label: 'Almendro', waterNeed: 'low' },
  { value: 'pistacho', label: 'Pistacho', waterNeed: 'low' },
  { value: 'horticolas', label: 'Hortícolas', waterNeed: 'high' },
  { value: 'aguacate', label: 'Aguacate', waterNeed: 'high' },
  { value: 'chirimoyo', label: 'Chirimoyo', waterNeed: 'high' },
  { value: 'mango', label: 'Mango', waterNeed: 'high' },
  { value: 'vinedo', label: 'Viñedo', waterNeed: 'medium' },
  { value: 'otros', label: 'Otros', waterNeed: 'medium' },
];

export function findCrop(value: string): Crop | undefined {
  return CROPS.find((c) => c.value === value);
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
