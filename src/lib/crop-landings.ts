export type CropZone = 'altiplano' | 'costa';

export interface CropLanding {
  zone: CropZone;
  crop: string;
  cropLabel: string;
  title: string;
  description: string;
  intro: string;
  municipalities: string;
  points: [string, string, string];
}

export const CROP_LANDINGS: CropLanding[] = [
  {
    zone: 'altiplano',
    crop: 'olivar',
    cropLabel: 'olivar',
    title: 'Riego y avisos para olivar en el Altiplano de Granada',
    description:
      'Consulta el clima local y recibe orientación de riego para olivar en Baza, Huéscar, Guadix y otros municipios del Altiplano de Granada.',
    intro:
      'Una previsión sencilla para decidir cuándo revisar el suelo, ajustar el riego y proteger tu olivar frente a heladas, viento y calor.',
    municipalities: 'Baza, Huéscar, Guadix, Cúllar, Orce y Galera',
    points: [
      'Avisos de helada, viento, lluvia y temperaturas extremas.',
      'Orientación de riego según el tiempo previsto y la fase del cultivo.',
      'Consulta rápida por municipio y contacto directo por WhatsApp.',
    ],
  },
  {
    zone: 'altiplano',
    crop: 'almendro',
    cropLabel: 'almendro',
    title: 'Clima y riego para almendro en el Altiplano de Granada',
    description:
      'Información local para cuidar almendros en el Altiplano de Granada con avisos de helada, lluvia, viento y recomendaciones orientativas de riego.',
    intro:
      'Adelántate a noches frías, cambios de tiempo y periodos secos con datos de tu municipio y recomendaciones fáciles de contrastar en la finca.',
    municipalities: 'Baza, Huéscar, Guadix, Cúllar, Orce y Galera',
    points: [
      'Especial atención a heladas y temperaturas bajas en floración.',
      'Orientación para ajustar riego durante los periodos secos.',
      'Avisos agrícolas adaptados a tu municipio.',
    ],
  },
  {
    zone: 'altiplano',
    crop: 'pistacho',
    cropLabel: 'pistacho',
    title: 'Riego y clima para pistacho en el Altiplano de Granada',
    description:
      'Revisa el tiempo y recibe orientación de riego para pistacho en Baza, Huéscar, Guadix y municipios del Altiplano de Granada.',
    intro:
      'Combina la previsión local con la observación del suelo y del cultivo para planificar mejor las labores del pistacho.',
    municipalities: 'Baza, Huéscar, Guadix, Cúllar, Orce y Galera',
    points: [
      'Avisos de calor, viento, lluvia y helada.',
      'Recomendaciones orientativas para periodos de mayor demanda.',
      'Información clara sin instalar ninguna aplicación.',
    ],
  },
  {
    zone: 'costa',
    crop: 'aguacate',
    cropLabel: 'aguacate',
    title: 'Riego y clima para aguacate en la Costa Tropical',
    description:
      'Consulta el tiempo local y recibe orientación de riego para aguacate en Motril, Almuñécar, Salobreña y la Costa Tropical de Granada.',
    intro:
      'Vigila calor, viento, lluvia y humedad para tomar decisiones más informadas en tu finca de aguacates.',
    municipalities: 'Motril, Almuñécar, Salobreña, Órgiva y Carchuna-Calahonda',
    points: [
      'Avisos de lluvia intensa, viento y temperaturas extremas.',
      'Orientación de riego ajustada a la previsión local.',
      'Contacto por WhatsApp para resolver dudas sobre tu municipio.',
    ],
  },
  {
    zone: 'costa',
    crop: 'mango',
    cropLabel: 'mango',
    title: 'Clima y riego para mango en la Costa Tropical',
    description:
      'Información meteorológica y orientación de riego para mango en Motril, Almuñécar y otros municipios de la Costa Tropical de Granada.',
    intro:
      'Consulta una previsión local para organizar el riego y vigilar viento, calor y lluvia en tu plantación de mango.',
    municipalities: 'Motril, Almuñécar, Salobreña, Órgiva y Carchuna-Calahonda',
    points: [
      'Previsión local para lluvia, viento y calor.',
      'Orientación de riego para las distintas fases del cultivo.',
      'Avisos sencillos directamente en tu móvil.',
    ],
  },
  {
    zone: 'costa',
    crop: 'chirimoyo',
    cropLabel: 'chirimoyo',
    title: 'Riego y avisos para chirimoyo en la Costa Tropical',
    description:
      'Consulta el clima y recibe recomendaciones orientativas de riego para chirimoyo en la Costa Tropical de Granada.',
    intro:
      'Datos locales para acompañar las decisiones de riego y el seguimiento del tiempo en fincas de chirimoyo.',
    municipalities: 'Motril, Almuñécar, Salobreña, Órgiva y Carchuna-Calahonda',
    points: [
      'Avisos de viento, lluvia y temperaturas extremas.',
      'Orientación para revisar el riego según la previsión.',
      'Información práctica por municipio y WhatsApp.',
    ],
  },
];

export function getCropLanding(zone: CropZone, crop: string) {
  return CROP_LANDINGS.find((landing) => landing.zone === zone && landing.crop === crop);
}
