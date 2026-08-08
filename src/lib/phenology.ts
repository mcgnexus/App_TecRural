import type { ZoneId } from './municipalities';
import type { CropStageValue } from './crops';
import { findCrop } from './crops';

/**
 * Etapa fenológica concreta de un cultivo (por ejemplo "Engorde del fruto").
 * Cada fase se traduce a una de las cuatro etapas genéricas usadas para el
 * riego (Kc FAO-56).
 */
export interface PhenoStage {
  key: string;
  label: string;
  /** Fase genérica equivalente que ajusta el Kc del riego. */
  kcStage: CropStageValue;
  /** Consejo agronómico breve para esa fase. */
  hint: string;
}

export interface PhenoWindow {
  /** Inicio del periodo (mes 1-12, día 1-31). */
  from: { m: number; d: number };
  /** Fin del periodo. Si "from" es posterior a "to", cruza fin de año. */
  to: { m: number; d: number };
  stageKey: string;
  /** Probabilidad estimada (0-100) de encontrar el cultivo en esa fase. */
  confidence: number;
  /** Razón: por qué se estima esa fase en esa fecha y zona. */
  reason: string;
}

export interface CropPhenology {
  /** Valor del cultivo en CROPS (olivar, almendro, …). */
  crop: string;
  stages: PhenoStage[];
  zones: Partial<Record<ZoneId, PhenoWindow[]>>;
  /** Avisos cuando el cultivo no es habitual en una zona. */
  warnings?: Partial<Record<ZoneId, string>>;
}

export interface PhenologyResult {
  crop: string;
  cropLabel: string;
  zone: ZoneId;
  date: Date;
  /** Todas las fases que coinciden con la fecha (normalmente una). */
  matches: Array<{ stage: PhenoStage; confidence: number; reason: string }>;
  /** Fase más probable. */
  main: PhenoStage;
  /** Fase genérica equivalente para el riego. */
  kcStage: CropStageValue;
  confidence: number;
  reason: string;
  warnings: string[];
}

/** Convierte mes+día a un número comparable (m*100+d), p. ej. 1231 > 228. */
function valueOf(m: number, d: number): number {
  return m * 100 + d;
}

/** true cuando una fecha (mes, día) cae dentro de una ventana (con salto de año). */
function inWindow(w: PhenoWindow, m: number, d: number): boolean {
  const v = valueOf(m, d);
  const from = valueOf(w.from.m, w.from.d);
  const to = valueOf(w.to.m, w.to.d);
  if (from <= to) return v >= from && v <= to;
  return v >= from || v <= to;
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

/**
 * Calendarios fenológicos por cultivo y zona. Fechas orientativas para el
 * Altiplano de Granada (interior, ~1000 m, heladas) y la Costa Tropical
 * (subtropical, casi sin heladas), basadas en la práctica habitual de ambas
 * comarcas. La probabilidad es una estimación para divulgación, no una
 * garantía: cada finca y variedad adelanta o retrasa el ciclo.
 */
export const CROP_PHENOLOGY: CropPhenology[] = [
  // -------------------------------------------------------------------------
  // OLIVAR
  // -------------------------------------------------------------------------
  {
    crop: 'olivar',
    stages: [
      { key: 'reposo', label: 'Reposo invernal', kcStage: 'inicio', hint: 'Parada vegetativa por el frío; consumo de agua mínimo.' },
      { key: 'brotacion', label: 'Brotación y floración', kcStage: 'inicio', hint: 'Brota la yema y florece la trama; fase muy sensible al estrés.' },
      { key: 'cuajado', label: 'Cuajado del fruto', kcStage: 'desarrollo', hint: 'La aceituna cuaja tras la flor; riegos estables evitan la caída.' },
      { key: 'hueso', label: 'Endurecimiento del hueso', kcStage: 'plena', hint: 'El hueso se endurece y el fruto empieza a acumular grasa.' },
      { key: 'engorde', label: 'Engorde del fruto', kcStage: 'plena', hint: 'Máxima demanda de agua y acumulación de aceite.' },
      { key: 'envero', label: 'Envero (cambio de color)', kcStage: 'madurez', hint: 'La aceituna cambia de color; baja la demanda de agua.' },
      { key: 'maduracion', label: 'Maduración', kcStage: 'madurez', hint: 'Máxima concentración de aceite; demanda de agua baja.' },
      { key: 'recoleccion', label: 'Recolección', kcStage: 'madurez', hint: 'Cosecha; conviene no regar para facilitar la recogida.' },
    ],
    zones: {
      altiplano: [
        { from: { m: 1, d: 1 }, to: { m: 2, d: 28 }, stageKey: 'reposo', confidence: 92, reason: 'En pleno invierno del Altiplano el olivo está en parada vegetativa; no crece y gasta muy poca agua.' },
        { from: { m: 3, d: 1 }, to: { m: 5, d: 15 }, stageKey: 'brotacion', confidence: 85, reason: 'Con la subida de temperaturas brota la yema y entre abril y mayo aparece la flor (trama). Es la fase más sensible a las heladas tardías de marzo.' },
        { from: { m: 5, d: 16 }, to: { m: 6, d: 20 }, stageKey: 'cuajado', confidence: 85, reason: 'Tras la floración la aceitunita cuaja; un golpe de calor o falta de agua provoca caída de fruto.' },
        { from: { m: 6, d: 21 }, to: { m: 7, d: 31 }, stageKey: 'hueso', confidence: 90, reason: 'El hueso se endurece en pleno verano y el fruto empieza a acumular grasa; es el momento de asegurar el riego.' },
        { from: { m: 8, d: 1 }, to: { m: 9, d: 30 }, stageKey: 'engorde', confidence: 90, reason: 'Agosto y septiembre son el engorde del fruto: el olivo acumula aceite y tiene la máxima demanda de agua del año.' },
        { from: { m: 10, d: 1 }, to: { m: 10, d: 31 }, stageKey: 'envero', confidence: 85, reason: 'En octubre la aceituna empieza a cambiar de color (envero) según la variedad.' },
        { from: { m: 11, d: 1 }, to: { m: 11, d: 20 }, stageKey: 'maduracion', confidence: 80, reason: 'A finales de noviembre el fruto alcanza su máxima concentración de aceite y está listo para cosechar.' },
        { from: { m: 11, d: 21 }, to: { m: 12, d: 31 }, stageKey: 'recoleccion', confidence: 85, reason: 'Diciembre es la campaña de recolección en el Altiplano; la aceituna suele ir ya verdeo o madura según la variedad.' },
      ],
      costa: [
        { from: { m: 1, d: 1 }, to: { m: 1, d: 31 }, stageKey: 'reposo', confidence: 80, reason: 'En la Costa el invierno es suave y el reposo es breve; el olivo casi no llega a parar del todo.' },
        { from: { m: 2, d: 1 }, to: { m: 4, d: 30 }, stageKey: 'brotacion', confidence: 85, reason: 'El clima subtropical adelanta la brotación y la floración, que en la Costa llega antes que en el interior.' },
        { from: { m: 5, d: 1 }, to: { m: 5, d: 31 }, stageKey: 'cuajado', confidence: 85, reason: 'Cuajado del fruto a finales de primavera; conviene mantener riegos estables.' },
        { from: { m: 6, d: 1 }, to: { m: 6, d: 30 }, stageKey: 'hueso', confidence: 85, reason: 'Endurecimiento del hueso antes del calor fuerte del verano.' },
        { from: { m: 7, d: 1 }, to: { m: 9, d: 30 }, stageKey: 'engorde', confidence: 90, reason: 'El verano en la Costa es la fase de engorde del fruto, con máxima demanda de agua.' },
        { from: { m: 10, d: 1 }, to: { m: 10, d: 31 }, stageKey: 'envero', confidence: 85, reason: 'Envero en octubre, adelantado unas semanas respecto al Altiplano.' },
        { from: { m: 11, d: 1 }, to: { m: 11, d: 15 }, stageKey: 'maduracion', confidence: 80, reason: 'Maduración temprana del fruto a comienzos de noviembre.' },
        { from: { m: 11, d: 16 }, to: { m: 12, d: 31 }, stageKey: 'recoleccion', confidence: 85, reason: 'Recolección adelantada: en la Costa se cosecha desde mediados de noviembre.' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // ALMENDRO
  // -------------------------------------------------------------------------
  {
    crop: 'almendro',
    stages: [
      { key: 'reposo', label: 'Reposo invernal', kcStage: 'inicio', hint: 'Árbol sin hojas; consumo de agua mínimo.' },
      { key: 'desborre', label: 'Desborre y floración', kcStage: 'inicio', hint: 'Primeras yemas y flor; muy sensible a las heladas.' },
      { key: 'cuajado', label: 'Cuajado del fruto', kcStage: 'desarrollo', hint: 'El fruto cuaja; el agua estable evita la caída.' },
      { key: 'engorde', label: 'Engorde del fruto', kcStage: 'desarrollo', hint: 'El fruto crece y endurece la cáscara.' },
      { key: 'endurecimiento', label: 'Endurecimiento del fruto', kcStage: 'plena', hint: 'La cáscara se endurece; demanda de agua máxima.' },
      { key: 'maduracion', label: 'Maduración', kcStage: 'madurez', hint: 'Apertura de la cáscara y secado del grano.' },
      { key: 'recoleccion', label: 'Recolección', kcStage: 'madurez', hint: 'Vareo o vibración; no conviene regar.' },
      { key: 'postcosecha', label: 'Postcosecha', kcStage: 'madurez', hint: 'Caída de hoja y preparación para el reposo.' },
    ],
    zones: {
      altiplano: [
        { from: { m: 1, d: 1 }, to: { m: 2, d: 14 }, stageKey: 'reposo', confidence: 90, reason: 'El almendro está en reposo invernal a la espera del desborre, que en el Altiplano no llega hasta mediados de febrero.' },
        { from: { m: 2, d: 15 }, to: { m: 3, d: 31 }, stageKey: 'desborre', confidence: 85, reason: 'El almendro florece en pleno invierno-primavera del Altiplano; es el momento de máximo riesgo por heladas.' },
        { from: { m: 4, d: 1 }, to: { m: 4, d: 30 }, stageKey: 'cuajado', confidence: 85, reason: 'Tras la flor, el fruto cuaja en abril; la falta de agua o un golpe de calor hace caer la almendra recién formada.' },
        { from: { m: 5, d: 1 }, to: { m: 6, d: 30 }, stageKey: 'engorde', confidence: 85, reason: 'Mayo y junio son el engorde del fruto; el riego en estas fechas mejora el tamaño y el llenado.' },
        { from: { m: 7, d: 1 }, to: { m: 7, d: 31 }, stageKey: 'endurecimiento', confidence: 90, reason: 'En pleno verano la cáscara se endurece y el grano empieza a llenarse; máxima demanda de agua.' },
        { from: { m: 8, d: 1 }, to: { m: 8, d: 31 }, stageKey: 'maduracion', confidence: 85, reason: 'En agosto la cáscara se abre y el grano madura y se seca.' },
        { from: { m: 9, d: 1 }, to: { m: 9, d: 30 }, stageKey: 'recoleccion', confidence: 90, reason: 'Septiembre es la recolección en el Altiplano; se deja de regar para que el grano se seque.' },
        { from: { m: 10, d: 1 }, to: { m: 12, d: 31 }, stageKey: 'postcosecha', confidence: 85, reason: 'Tras la cosecha el árbol pierde la hoja y prepara el reposo invernal.' },
      ],
      costa: [
        { from: { m: 1, d: 1 }, to: { m: 1, d: 15 }, stageKey: 'reposo', confidence: 80, reason: 'En la Costa el reposo es muy corto por el invierno templado.' },
        { from: { m: 1, d: 16 }, to: { m: 2, d: 29 }, stageKey: 'desborre', confidence: 85, reason: 'La floración llega pronto, en pleno enero-febrero, adelantada por el clima costero.' },
        { from: { m: 3, d: 1 }, to: { m: 3, d: 31 }, stageKey: 'cuajado', confidence: 85, reason: 'Cuajado del fruto a comienzos de primavera.' },
        { from: { m: 4, d: 1 }, to: { m: 5, d: 31 }, stageKey: 'engorde', confidence: 85, reason: 'Engorde del fruto en abril y mayo.' },
        { from: { m: 6, d: 1 }, to: { m: 6, d: 30 }, stageKey: 'endurecimiento', confidence: 85, reason: 'Endurecimiento de la cáscara en junio.' },
        { from: { m: 7, d: 1 }, to: { m: 7, d: 31 }, stageKey: 'maduracion', confidence: 85, reason: 'Maduración del grano en julio, adelantada respecto al interior.' },
        { from: { m: 8, d: 1 }, to: { m: 8, d: 31 }, stageKey: 'recoleccion', confidence: 90, reason: 'Recolección en agosto.' },
        { from: { m: 9, d: 1 }, to: { m: 12, d: 31 }, stageKey: 'postcosecha', confidence: 85, reason: 'Postcosecha y caída de hoja hasta el reposo.' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // PISTACHO
  // -------------------------------------------------------------------------
  {
    crop: 'pistacho',
    stages: [
      { key: 'reposo', label: 'Reposo invernal', kcStage: 'inicio', hint: 'Parada vegetativa; necesita el frío para una buena brotación.' },
      { key: 'brotacion', label: 'Brotación', kcStage: 'inicio', hint: 'Salida de yemas; sensible a heladas tardías.' },
      { key: 'floracion', label: 'Floración', kcStage: 'inicio', hint: 'Inflorescencias; el viento poliniza, evita regar por aspersión.' },
      { key: 'cuajado', label: 'Cuajado', kcStage: 'desarrollo', hint: 'El fruto cuaja; riegos estables.' },
      { key: 'desarrollo', label: 'Desarrollo del fruto', kcStage: 'desarrollo', hint: 'El fruto crece y engorda.' },
      { key: 'endurecimiento', label: 'Endurecimiento del fruto', kcStage: 'plena', hint: 'La cáscara se endurece; máxima demanda de agua.' },
      { key: 'llenado', label: 'Llenado del grano', kcStage: 'plena', hint: 'El grano se llena y acumula materia seca.' },
      { key: 'cosecha', label: 'Recolección', kcStage: 'madurez', hint: 'La cáscara se abre y se cosecha el fruto.' },
    ],
    zones: {
      altiplano: [
        { from: { m: 10, d: 16 }, to: { m: 2, d: 28 }, stageKey: 'reposo', confidence: 92, reason: 'El pistacho pasa un largo reposo invernal en el interior; el frío acumulado en el Altiplano favorece una brotación uniforme.' },
        { from: { m: 3, d: 1 }, to: { m: 3, d: 31 }, stageKey: 'brotacion', confidence: 85, reason: 'Con la primavera brotan las yemas; vigila las heladas tardías de marzo.' },
        { from: { m: 4, d: 1 }, to: { m: 4, d: 30 }, stageKey: 'floracion', confidence: 85, reason: 'Abril es la floración; el polen viaja con el viento, así que evita el riego por aspersión en estas semanas.' },
        { from: { m: 5, d: 1 }, to: { m: 5, d: 31 }, stageKey: 'cuajado', confidence: 85, reason: 'Cuajado del fruto tras la floración.' },
        { from: { m: 6, d: 1 }, to: { m: 6, d: 30 }, stageKey: 'desarrollo', confidence: 85, reason: 'El fruto se desarrolla en junio.' },
        { from: { m: 7, d: 1 }, to: { m: 7, d: 31 }, stageKey: 'endurecimiento', confidence: 90, reason: 'En pleno verano la cáscara se endurece; es la fase de máxima demanda de agua.' },
        { from: { m: 8, d: 1 }, to: { m: 8, d: 31 }, stageKey: 'llenado', confidence: 90, reason: 'Agosto es el llenado del grano; no debe faltar agua para un buen pistacho.' },
        { from: { m: 9, d: 1 }, to: { m: 10, d: 15 }, stageKey: 'cosecha', confidence: 90, reason: 'Recolección en septiembre y primeros de octubre, cuando la cáscara se abre.' },
      ],
      costa: [
        { from: { m: 10, d: 1 }, to: { m: 2, d: 15 }, stageKey: 'reposo', confidence: 85, reason: 'En la Costa el pistacho también reposa en invierno, pero con menos horas de frío, lo que puede adelantar la brotación.' },
        { from: { m: 2, d: 16 }, to: { m: 3, d: 15 }, stageKey: 'brotacion', confidence: 85, reason: 'Brotación adelantada por el clima suave.' },
        { from: { m: 3, d: 16 }, to: { m: 4, d: 15 }, stageKey: 'floracion', confidence: 85, reason: 'Floración a finales de marzo y comienzos de abril.' },
        { from: { m: 4, d: 16 }, to: { m: 5, d: 15 }, stageKey: 'cuajado', confidence: 85, reason: 'Cuajado del fruto.' },
        { from: { m: 5, d: 16 }, to: { m: 6, d: 15 }, stageKey: 'desarrollo', confidence: 85, reason: 'Desarrollo del fruto a finales de primavera.' },
        { from: { m: 6, d: 16 }, to: { m: 7, d: 15 }, stageKey: 'endurecimiento', confidence: 85, reason: 'Endurecimiento de la cáscara.' },
        { from: { m: 7, d: 16 }, to: { m: 8, d: 15 }, stageKey: 'llenado', confidence: 85, reason: 'Llenado del grano en pleno verano.' },
        { from: { m: 8, d: 16 }, to: { m: 9, d: 30 }, stageKey: 'cosecha', confidence: 90, reason: 'Recolección desde mediados de agosto.' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // HORTÍCOLAS (ciclos al aire libre)
  // -------------------------------------------------------------------------
  {
    crop: 'horticolas',
    stages: [
      { key: 'semillero', label: 'Semillero / almácigo', kcStage: 'inicio', hint: 'Siembra en semillero protegido o a raíz desnuda.' },
      { key: 'trasplante', label: 'Plantación / trasplante', kcStage: 'inicio', hint: 'Plantación a campo; la plántula enraíza y gasta poca agua.' },
      { key: 'desarrollo', label: 'Desarrollo vegetativo', kcStage: 'desarrollo', hint: 'La planta crece en verde y aumenta la demanda de agua.' },
      { key: 'floracion', label: 'Floración y cuajado', kcStage: 'plena', hint: 'Floración y cuajado del fruto; máxima sensibilidad al estrés.' },
      { key: 'engorde', label: 'Engorde del fruto', kcStage: 'plena', hint: 'El fruto engorda; máxima demanda de agua.' },
      { key: 'cosecha', label: 'Recolección', kcStage: 'madurez', hint: 'Cosecha continua; riegos moderados.' },
      { key: 'barbecho', label: 'Final de ciclo / barbecho', kcStage: 'madurez', hint: 'Suelo en descanso o preparación de la próxima campaña.' },
    ],
    warnings: {
      altiplano: 'Las hortícolas son muy variadas (tomate, pimiento, calabacín…). Se estima el ciclo típico al aire libre de primavera-verano, tras el riesgo de heladas.',
      costa: 'En la Costa Tropical se cultivan hortalizas casi todo el año, con varios ciclos; se muestra el ciclo aproximado más común.',
    },
    zones: {
      altiplano: [
        { from: { m: 2, d: 15 }, to: { m: 3, d: 31 }, stageKey: 'semillero', confidence: 80, reason: 'En invierno las hortalizas se siembran en semillero protegido para trasplantar al aire libre después de las heladas.' },
        { from: { m: 4, d: 1 }, to: { m: 5, d: 15 }, stageKey: 'trasplante', confidence: 85, reason: 'Abril es el trasplante habitual al aire libre en el Altiplano, una vez superado el riesgo de heladas.' },
        { from: { m: 5, d: 16 }, to: { m: 6, d: 30 }, stageKey: 'desarrollo', confidence: 85, reason: 'Crecimiento vegetativo a finales de primavera; sube la demanda de agua.' },
        { from: { m: 7, d: 1 }, to: { m: 7, d: 31 }, stageKey: 'floracion', confidence: 85, reason: 'Floración y cuajado en pleno verano; la planta es muy sensible al calor y a la falta de agua.' },
        { from: { m: 8, d: 1 }, to: { m: 8, d: 31 }, stageKey: 'engorde', confidence: 85, reason: 'Agosto es el engorde del fruto, con máxima demanda de agua.' },
        { from: { m: 9, d: 1 }, to: { m: 10, d: 15 }, stageKey: 'cosecha', confidence: 85, reason: 'Recolección desde septiembre hasta mediados de octubre.' },
        { from: { m: 10, d: 16 }, to: { m: 2, d: 14 }, stageKey: 'barbecho', confidence: 80, reason: 'Final de ciclo y barbecho en otoño-invierno, hasta la nueva campaña.' },
      ],
      costa: [
        { from: { m: 1, d: 1 }, to: { m: 2, d: 15 }, stageKey: 'semillero', confidence: 75, reason: 'En la Costa se preparan semilleros todo el invierno para los primeros ciclos del año.' },
        { from: { m: 2, d: 16 }, to: { m: 3, d: 31 }, stageKey: 'trasplante', confidence: 85, reason: 'Primer trasplante de la campaña en febrero-marzo, sin riesgo de heladas.' },
        { from: { m: 4, d: 1 }, to: { m: 5, d: 15 }, stageKey: 'desarrollo', confidence: 85, reason: 'Desarrollo vegetativo en primavera.' },
        { from: { m: 5, d: 16 }, to: { m: 6, d: 15 }, stageKey: 'floracion', confidence: 85, reason: 'Floración y cuajado de la primera cosecha.' },
        { from: { m: 6, d: 16 }, to: { m: 7, d: 15 }, stageKey: 'engorde', confidence: 85, reason: 'Engorde del fruto antes de la primera recolección.' },
        { from: { m: 7, d: 16 }, to: { m: 8, d: 31 }, stageKey: 'cosecha', confidence: 85, reason: 'Recolección del primer ciclo en verano.' },
        { from: { m: 9, d: 1 }, to: { m: 10, d: 15 }, stageKey: 'trasplante', confidence: 80, reason: 'Segundo ciclo: trasplante de otoño para la campaña de invierno.' },
        { from: { m: 10, d: 16 }, to: { m: 11, d: 15 }, stageKey: 'desarrollo', confidence: 80, reason: 'Desarrollo vegetativo del ciclo de otoño.' },
        { from: { m: 11, d: 16 }, to: { m: 12, d: 15 }, stageKey: 'floracion', confidence: 80, reason: 'Floración y cuajado del ciclo de otoño-invierno.' },
        { from: { m: 12, d: 16 }, to: { m: 12, d: 31 }, stageKey: 'cosecha', confidence: 75, reason: 'Inicio de la recolección invernal en la Costa.' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // AGUACATE
  // -------------------------------------------------------------------------
  {
    crop: 'aguacate',
    stages: [
      { key: 'floracion', label: 'Floración', kcStage: 'inicio', hint: 'Floración; sensible a viento y heladas.' },
      { key: 'cuajado', label: 'Cuajado', kcStage: 'desarrollo', hint: 'El fruto cuaja y empieza a crecer.' },
      { key: 'engorde', label: 'Engorde del fruto', kcStage: 'plena', hint: 'El fruto engorda y acumula grasa durante muchos meses.' },
      { key: 'madurez', label: 'Maduración / recolección', kcStage: 'madurez', hint: 'El fruto madura sobre el árbol; en la Costa casi siempre hay recolección.' },
    ],
    warnings: {
      altiplano: 'El aguacate es un cultivo subtropical: en el Altiplano solo es viable bajo protección (malla o invernadero) y con bajo rendimiento por las heladas.',
    },
    zones: {
      costa: [
        { from: { m: 1, d: 1 }, to: { m: 3, d: 31 }, stageKey: 'floracion', confidence: 85, reason: 'El aguacate florece en invierno-primavera en la Costa; la floración es muy sensible al viento seco de levante.' },
        { from: { m: 4, d: 1 }, to: { m: 5, d: 31 }, stageKey: 'cuajado', confidence: 85, reason: 'Cuajado del fruto en primavera; el fruto empieza su lento desarrollo.' },
        { from: { m: 6, d: 1 }, to: { m: 11, d: 15 }, stageKey: 'engorde', confidence: 90, reason: 'El fruto engorda durante todo el verano y el otoño; es un cultivo de demanda de agua continua (los frutos tardan meses en madurar).' },
        { from: { m: 11, d: 16 }, to: { m: 12, d: 31 }, stageKey: 'madurez', confidence: 85, reason: 'Maduración y recolección desde finales de otoño; según la variedad (Hass, Bacon…) hay fruta casi todo el año.' },
      ],
      altiplano: [
        { from: { m: 1, d: 1 }, to: { m: 3, d: 31 }, stageKey: 'floracion', confidence: 70, reason: 'Floración protegida (bajo malla o invernadero); el aguacate no es un cultivo de pleno campo en el Altiplano.' },
        { from: { m: 4, d: 1 }, to: { m: 11, d: 30 }, stageKey: 'engorde', confidence: 75, reason: 'Lento engorde del fruto durante el ciclo cálido, siempre con protección frente a heladas.' },
        { from: { m: 12, d: 1 }, to: { m: 12, d: 31 }, stageKey: 'madurez', confidence: 70, reason: 'Maduración de parte de la fruta a finales de año.' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // CHIRIMOYO
  // -------------------------------------------------------------------------
  {
    crop: 'chirimoyo',
    stages: [
      { key: 'reposo', label: 'Parada invernal', kcStage: 'inicio', hint: 'El árbol pierde hoja y reposa; sensible a heladas.' },
      { key: 'brotacion', label: 'Brotación', kcStage: 'inicio', hint: 'Salida de yemas y hojas nuevas.' },
      { key: 'floracion', label: 'Floración (polinización)', kcStage: 'desarrollo', hint: 'Floración; en la Costa suele requerir polinización manual.' },
      { key: 'desarrollo', label: 'Desarrollo del fruto', kcStage: 'plena', hint: 'El fruto crece durante el verano.' },
      { key: 'maduracion', label: 'Maduración', kcStage: 'madurez', hint: 'El fruto madura y se ablanda.' },
      { key: 'recoleccion', label: 'Recolección', kcStage: 'madurez', hint: 'Cosecha en otoño-invierno; fruto muy delicado.' },
    ],
    warnings: {
      altiplano: 'El chirimoyo es subtropical y solo se da en la Costa Tropical; en el Altiplano no es viable al aire libre por las heladas.',
    },
    zones: {
      costa: [
        { from: { m: 1, d: 1 }, to: { m: 1, d: 31 }, stageKey: 'reposo', confidence: 80, reason: 'Breve parada invernal tras la recolección; el invierno suave de la Costa apenas detiene el árbol.' },
        { from: { m: 2, d: 1 }, to: { m: 4, d: 30 }, stageKey: 'brotacion', confidence: 85, reason: 'Brotación en primavera, con la subida de temperaturas.' },
        { from: { m: 5, d: 1 }, to: { m: 6, d: 30 }, stageKey: 'floracion', confidence: 85, reason: 'Floración en mayo-junio; en la Costa se suele polinizar a mano para asegurar el cuajado.' },
        { from: { m: 7, d: 1 }, to: { m: 9, d: 30 }, stageKey: 'desarrollo', confidence: 90, reason: 'El fruto se desarrolla durante el verano; la demanda de agua es alta y constante.' },
        { from: { m: 10, d: 1 }, to: { m: 10, d: 31 }, stageKey: 'maduracion', confidence: 85, reason: 'Maduración en octubre, antes de la recolección.' },
        { from: { m: 11, d: 1 }, to: { m: 12, d: 31 }, stageKey: 'recoleccion', confidence: 85, reason: 'Recolección en otoño-invierno; el fruto es muy delicado y no debe recibir agua antes de recoger.' },
      ],
      altiplano: [
        { from: { m: 1, d: 1 }, to: { m: 12, d: 31 }, stageKey: 'reposo', confidence: 60, reason: 'El chirimoyo no es viable al aire libre en el Altiplano: sufriría heladas. Esta fecha solo aplica a cultivo protegido experimental.' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // MANGO
  // -------------------------------------------------------------------------
  {
    crop: 'mango',
    stages: [
      { key: 'reposo', label: 'Reposo', kcStage: 'madurez', hint: 'Parada vegetativa antes de la floración.' },
      { key: 'brotacion', label: 'Brotación vegetativa y floral', kcStage: 'inicio', hint: 'Empieza el ciclo; la planta se prepara para florecer.' },
      { key: 'floracion', label: 'Floración', kcStage: 'inicio', hint: 'Inflorescencias; sensible al calor extremo y al viento.' },
      { key: 'cuajado', label: 'Cuajado', kcStage: 'desarrollo', hint: 'El fruto cuaja; evita el estrés hídrico.' },
      { key: 'desarrollo', label: 'Desarrollo del fruto', kcStage: 'plena', hint: 'El fruto crece rápido.' },
      { key: 'engorde', label: 'Engorde y maduración', kcStage: 'plena', hint: 'El fruto engorda y madura.' },
      { key: 'cosecha', label: 'Cosecha', kcStage: 'madurez', hint: 'Recolección del fruto.' },
    ],
    warnings: {
      altiplano: 'El mango es subtropical: en el Altiplano solo es viable bajo protección y con rendimientos bajos.',
    },
    zones: {
      costa: [
        { from: { m: 10, d: 1 }, to: { m: 1, d: 31 }, stageKey: 'reposo', confidence: 85, reason: 'El mango reposa en otoño-invierno; esta parada previa es la que favorece una buena floración.' },
        { from: { m: 2, d: 1 }, to: { m: 2, d: 28 }, stageKey: 'brotacion', confidence: 85, reason: 'Brotación vegetativa y floral a finales del invierno costero.' },
        { from: { m: 3, d: 1 }, to: { m: 4, d: 15 }, stageKey: 'floracion', confidence: 85, reason: 'Floración en primavera; evita el riego por aspersión en estas semanas.' },
        { from: { m: 4, d: 16 }, to: { m: 5, d: 31 }, stageKey: 'cuajado', confidence: 85, reason: 'Cuajado del fruto a finales de primavera.' },
        { from: { m: 6, d: 1 }, to: { m: 6, d: 30 }, stageKey: 'desarrollo', confidence: 85, reason: 'Desarrollo rápido del fruto en junio.' },
        { from: { m: 7, d: 1 }, to: { m: 8, d: 31 }, stageKey: 'engorde', confidence: 90, reason: 'Engorde y maduración del fruto en pleno verano; máxima demanda de agua.' },
        { from: { m: 9, d: 1 }, to: { m: 9, d: 30 }, stageKey: 'cosecha', confidence: 90, reason: 'Cosecha del mango a principios de otoño.' },
      ],
      altiplano: [
        { from: { m: 1, d: 1 }, to: { m: 12, d: 31 }, stageKey: 'reposo', confidence: 55, reason: 'El mango no es viable al aire libre en el Altiplano por las heladas; solo prospera protegido y con floración tardía.' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // VIÑEDO
  // -------------------------------------------------------------------------
  {
    crop: 'vinedo',
    stages: [
      { key: 'reposo', label: 'Reposo invernal', kcStage: 'inicio', hint: 'Cepa dormida; es el momento de la poda.' },
      { key: 'llanto', label: 'Llanto y desborre', kcStage: 'inicio', hint: 'La cepa "llora"; salen las primeras yemas.' },
      { key: 'brotacion', label: 'Brotación', kcStage: 'inicio', hint: 'Brotes y hojas nuevas; sensible a heladas tardías.' },
      { key: 'floracion', label: 'Floración', kcStage: 'desarrollo', hint: 'Floración del racimo.' },
      { key: 'cuajado', label: 'Cuajado', kcStage: 'desarrollo', hint: 'El grano cuaja.' },
      { key: 'envero', label: 'Envero', kcStage: 'plena', hint: 'El grano cambia de color y acumula azúcar.' },
      { key: 'maduracion', label: 'Maduración', kcStage: 'plena', hint: 'El grano madura y gana azúcar.' },
      { key: 'vendimia', label: 'Vendimia', kcStage: 'madurez', hint: 'Cosecha de la uva.' },
      { key: 'postvendimia', label: 'Postvendimia', kcStage: 'madurez', hint: 'Caída de hoja y preparación del reposo.' },
    ],
    zones: {
      altiplano: [
        { from: { m: 11, d: 1 }, to: { m: 2, d: 28 }, stageKey: 'reposo', confidence: 90, reason: 'En invierno la cepa está en reposo; es la época de la poda en el Altiplano.' },
        { from: { m: 3, d: 1 }, to: { m: 3, d: 31 }, stageKey: 'llanto', confidence: 85, reason: 'En marzo la cepa "llora" y comienza el desborre; el movimiento de savia marca el arranque del ciclo.' },
        { from: { m: 4, d: 1 }, to: { m: 4, d: 30 }, stageKey: 'brotacion', confidence: 85, reason: 'Brotación en abril; vigila las heladas tardías de primavera, muy peligrosas para el brote nuevo.' },
        { from: { m: 5, d: 1 }, to: { m: 5, d: 31 }, stageKey: 'floracion', confidence: 85, reason: 'Floración en mayo; el viento o la lluvia en plena flor reducen el cuajado.' },
        { from: { m: 6, d: 1 }, to: { m: 6, d: 30 }, stageKey: 'cuajado', confidence: 85, reason: 'Cuajado del grano en junio.' },
        { from: { m: 7, d: 1 }, to: { m: 7, d: 31 }, stageKey: 'envero', confidence: 90, reason: 'Envero en pleno verano: el grano cambia de color y empieza a acumular azúcar.' },
        { from: { m: 8, d: 1 }, to: { m: 9, d: 15 }, stageKey: 'maduracion', confidence: 90, reason: 'Maduración del grano en agosto y primeros de septiembre.' },
        { from: { m: 9, d: 16 }, to: { m: 10, d: 15 }, stageKey: 'vendimia', confidence: 90, reason: 'Vendimia desde mediados de septiembre hasta mediados de octubre en el Altiplano.' },
        { from: { m: 10, d: 16 }, to: { m: 10, d: 31 }, stageKey: 'postvendimia', confidence: 80, reason: 'Caída de hoja tras la cosecha, antes del reposo.' },
      ],
      costa: [
        { from: { m: 11, d: 1 }, to: { m: 2, d: 15 }, stageKey: 'reposo', confidence: 90, reason: 'Reposo invernal; la poda se hace algo antes que en el interior por el clima templado.' },
        { from: { m: 2, d: 16 }, to: { m: 3, d: 15 }, stageKey: 'llanto', confidence: 85, reason: 'Desborre adelantado a finales del invierno costero.' },
        { from: { m: 3, d: 16 }, to: { m: 4, d: 15 }, stageKey: 'brotacion', confidence: 85, reason: 'Brotación adelantada en la Costa.' },
        { from: { m: 4, d: 16 }, to: { m: 5, d: 15 }, stageKey: 'floracion', confidence: 85, reason: 'Floración a finales de primavera.' },
        { from: { m: 5, d: 16 }, to: { m: 6, d: 15 }, stageKey: 'cuajado', confidence: 85, reason: 'Cuajado del grano.' },
        { from: { m: 6, d: 16 }, to: { m: 7, d: 15 }, stageKey: 'envero', confidence: 85, reason: 'Envero adelantado por el calor costero.' },
        { from: { m: 7, d: 16 }, to: { m: 8, d: 31 }, stageKey: 'maduracion', confidence: 85, reason: 'Maduración del grano en pleno verano.' },
        { from: { m: 9, d: 1 }, to: { m: 9, d: 30 }, stageKey: 'vendimia', confidence: 90, reason: 'Vendimia temprana en la Costa, desde comienzos de septiembre.' },
        { from: { m: 10, d: 1 }, to: { m: 10, d: 31 }, stageKey: 'postvendimia', confidence: 80, reason: 'Postvendimia y caída de hoja.' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // OTROS (ciclo genérico de cultivo leñoso/herbáceo)
  // -------------------------------------------------------------------------
  {
    crop: 'otros',
    stages: [
      { key: 'inicio', label: 'Inicio / brotación', kcStage: 'inicio', hint: 'Arranque del ciclo; consumo de agua bajo.' },
      { key: 'desarrollo', label: 'Desarrollo / crecimiento', kcStage: 'desarrollo', hint: 'Crecimiento activo; la demanda sube.' },
      { key: 'plena', label: 'Plena producción', kcStage: 'plena', hint: 'Máxima demanda de agua.' },
      { key: 'madurez', label: 'Maduración / reposo', kcStage: 'madurez', hint: 'Final de ciclo o reposo; demanda baja.' },
    ],
    zones: {
      altiplano: [
        { from: { m: 3, d: 1 }, to: { m: 4, d: 30 }, stageKey: 'inicio', confidence: 80, reason: 'Ciclo genérico del Altiplano: el arranque llega con la primavera, tras el riesgo de heladas.' },
        { from: { m: 5, d: 1 }, to: { m: 6, d: 30 }, stageKey: 'desarrollo', confidence: 85, reason: 'Crecimiento activo en primavera-verano.' },
        { from: { m: 7, d: 1 }, to: { m: 8, d: 31 }, stageKey: 'plena', confidence: 90, reason: 'Plena producción en pleno verano, con máxima demanda de agua.' },
        { from: { m: 9, d: 1 }, to: { m: 2, d: 28 }, stageKey: 'madurez', confidence: 85, reason: 'Final de ciclo o reposo desde el otoño hasta el invierno.' },
      ],
      costa: [
        { from: { m: 2, d: 1 }, to: { m: 3, d: 31 }, stageKey: 'inicio', confidence: 80, reason: 'Ciclo genérico de la Costa: el arranque es más temprano por el clima subtropical.' },
        { from: { m: 4, d: 1 }, to: { m: 5, d: 31 }, stageKey: 'desarrollo', confidence: 85, reason: 'Crecimiento activo en primavera.' },
        { from: { m: 6, d: 1 }, to: { m: 8, d: 31 }, stageKey: 'plena', confidence: 90, reason: 'Plena producción en verano.' },
        { from: { m: 9, d: 1 }, to: { m: 1, d: 31 }, stageKey: 'madurez', confidence: 85, reason: 'Final de ciclo o maduración de otoño a invierno.' },
      ],
    },
  },
];

const STAGE_INDEX = new Map<string, PhenoStage>();
for (const crop of CROP_PHENOLOGY) {
  for (const stage of crop.stages) STAGE_INDEX.set(`${crop.crop}:${stage.key}`, stage);
}

/**
 * Deduce la etapa fenológica más probable de un cultivo según la fecha y la
 * zona (Altiplano o Costa Tropical). Devuelve la fase concreta y su
 * equivalente genérico para el cálculo de riego.
 */
export function currentPhenology(
  cropValue: string,
  zone: ZoneId,
  date: Date = new Date()
): PhenologyResult {
  const cropData = CROP_PHENOLOGY.find((c) => c.crop === cropValue);
  const cropLabel = findCrop(cropValue)?.label ?? cropValue;

  const warnings: string[] = [];
  if (cropData?.warnings?.[zone]) warnings.push(cropData.warnings[zone]);

  if (!cropData) {
    return {
      crop: cropValue,
      cropLabel,
      zone,
      date,
      matches: [],
      main: {
        key: 'desconocido',
        label: 'Etapa no definida',
        kcStage: 'desarrollo',
        hint: 'No hay un calendario fenológico para este cultivo.',
      },
      kcStage: 'desarrollo',
      confidence: 0,
      reason: 'No hay un calendario fenológico para este cultivo.',
      warnings,
    };
  }

  const windows = cropData.zones[zone] ?? [];
  const m = date.getMonth() + 1;
  const d = date.getDate();

  const matches = windows
    .filter((w) => inWindow(w, m, d))
    .map((w) => ({
      stage: STAGE_INDEX.get(`${cropValue}:${w.stageKey}`) ?? cropData.stages[0],
      confidence: w.confidence,
      reason: w.reason,
    }))
    .sort((a, b) => b.confidence - a.confidence);

  if (matches.length === 0) {
    return {
      crop: cropValue,
      cropLabel,
      zone,
      date,
      matches: [],
      main: {
        key: 'indefinida',
        label: 'Etapa de transición',
        kcStage: 'desarrollo',
        hint: 'Fechas de cambio entre dos fases; observa el cultivo para confirmar.',
      },
      kcStage: 'desarrollo',
      confidence: 60,
      reason: 'La fecha cae entre dos fases fenológicas; comprueba el cultivo en campo.',
      warnings,
    };
  }

  const best = matches[0];
  return {
    crop: cropValue,
    cropLabel,
    zone,
    date,
    matches,
    main: best.stage,
    kcStage: best.stage.kcStage,
    confidence: best.confidence,
    reason: best.reason,
    warnings,
  };
}
