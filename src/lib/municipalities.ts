export interface Municipality {
  name: string;
  zone: 'altiplano' | 'costa';
  lat: number;
  lon: number;
  /** Código oficial de municipio de AEMET (misma codificación que el INE). */
  aemet: string;
  /** Código INE de la provincia (para los avisos oficiales de AEMET). */
  province: string;
}

export const ZONES = [
  { id: 'altiplano', label: 'Altiplano de Granada' },
  { id: 'costa', label: 'Costa Tropical' },
] as const;

export type ZoneId = (typeof ZONES)[number]['id'];

export const MUNICIPALITIES: Municipality[] = [
  // ---- Altiplano de Granada ----
  { name: 'Huéscar', zone: 'altiplano', lat: 37.809, lon: -2.541, aemet: '18098', province: '18' },
  { name: 'Baza', zone: 'altiplano', lat: 37.492, lon: -2.772, aemet: '18023', province: '18' },
  { name: 'Puebla de Don Fadrique', zone: 'altiplano', lat: 37.958, lon: -2.435, aemet: '18164', province: '18' },
  { name: 'Castril', zone: 'altiplano', lat: 37.798, lon: -2.779, aemet: '18046', province: '18' },
  { name: 'Castilléjar', zone: 'altiplano', lat: 37.714, lon: -2.643, aemet: '18045', province: '18' },
  { name: 'Orce', zone: 'altiplano', lat: 37.723, lon: -2.478, aemet: '18146', province: '18' },
  { name: 'Galera', zone: 'altiplano', lat: 37.744, lon: -2.55, aemet: '18082', province: '18' },
  { name: 'Cúllar', zone: 'altiplano', lat: 37.583, lon: -2.576, aemet: '18056', province: '18' },
  { name: 'Benamaurel', zone: 'altiplano', lat: 37.608, lon: -2.704, aemet: '18029', province: '18' },
  { name: 'Zújar', zone: 'altiplano', lat: 37.542, lon: -2.84, aemet: '18194', province: '18' },
  { name: 'Freila', zone: 'altiplano', lat: 37.529, lon: -2.908, aemet: '18078', province: '18' },
  { name: 'Caniles', zone: 'altiplano', lat: 37.434, lon: -2.724, aemet: '18039', province: '18' },
  { name: 'Cortes de Baza', zone: 'altiplano', lat: 37.484, lon: -2.77, aemet: '18053', province: '18' },
  // ---- Costa Tropical ----
  { name: 'Almuñécar', zone: 'costa', lat: 36.734, lon: -3.691, aemet: '18017', province: '18' },
  { name: 'La Herradura (Almuñécar)', zone: 'costa', lat: 36.735, lon: -3.736, aemet: '18017', province: '18' },
  { name: 'Salobreña', zone: 'costa', lat: 36.745, lon: -3.59, aemet: '18173', province: '18' },
  { name: 'Motril', zone: 'costa', lat: 36.745, lon: -3.518, aemet: '18140', province: '18' },
  { name: 'Carchuna-Calahonda (Motril)', zone: 'costa', lat: 36.717, lon: -3.45, aemet: '18140', province: '18' },
  { name: 'Gualchos-Castell de Ferro', zone: 'costa', lat: 36.743, lon: -3.388, aemet: '18093', province: '18' },
  { name: 'Polopos', zone: 'costa', lat: 36.762, lon: -3.295, aemet: '18162', province: '18' },
  { name: 'Órgiva', zone: 'costa', lat: 36.904, lon: -3.421, aemet: '18147', province: '18' },
  { name: 'Vélez de Benaudalla', zone: 'costa', lat: 36.834, lon: -3.518, aemet: '18184', province: '18' },
  { name: 'Sorvilán', zone: 'costa', lat: 36.795, lon: -3.268, aemet: '18177', province: '18' },
  { name: 'Rubite', zone: 'costa', lat: 36.808, lon: -3.348, aemet: '18170', province: '18' },
  { name: 'Lújar', zone: 'costa', lat: 36.787, lon: -3.4, aemet: '18124', province: '18' },
];

export function municipalitiesByZone(zone: ZoneId | ''): Municipality[] {
  if (!zone) return MUNICIPALITIES;
  return MUNICIPALITIES.filter((m) => m.zone === zone);
}

export function findMunicipality(name: string): Municipality | undefined {
  return MUNICIPALITIES.find((m) => m.name === name);
}
