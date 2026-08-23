'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WeatherData, WeatherSource } from '@/lib/weather';
import { weatherCodeToLabel } from '@/lib/weather';
import { computeRisks, getRecommendation } from '@/lib/recommendations';
import type { RiskLevel } from '@/lib/weather';
import { ZONES, municipalitiesByZone, findMunicipality, findNearestMunicipality } from '@/lib/municipalities';
import { CROPS, CROP_STAGES, findCrop, type CropStageValue } from '@/lib/crops';
import { computeIrrigation, formatLitros } from '@/lib/irrigation';
import { computeAlarms, type AlarmKind } from '@/lib/alarms';
import { currentPhenology, formatDateLong } from '@/lib/phenology';
import { buildWhatsAppLink, businessName } from '@/lib/wa';
import LocationSelector from './LocationSelector';
import TrackedWhatsAppLink from './TrackedWhatsAppLink';
import { trackEvent } from './Analytics';
import {
  SunIcon,
  DropletIcon,
  WindIcon,
  RainIcon,
  ThermometerIcon,
  ClockIcon,
  LightningIcon,
  AlertShieldIcon,
  HailIcon,
  WhatsAppIcon,
} from './icons';

type Status = 'idle' | 'loading' | 'ok' | 'error';

const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
};

const SOURCE_LABEL: Record<WeatherSource, string> = {
  aemet: 'Datos oficiales AEMET',
  openmeteo: 'Datos Open-Meteo',
  hybrid: 'AEMET + Open-Meteo',
  mock: 'Datos orientativos',
};

const SOURCE_TITLE: Record<WeatherSource, string> = {
  aemet: 'Previsión oficial de la Agencia Estatal de Meteorología (AEMET).',
  openmeteo:
    'Datos del modelo meteorológico Open-Meteo (AEMET no está disponible en este momento).',
  hybrid:
    'Condiciones actuales y previsión de hoy de AEMET (oficial); tendencia de los próximos días de Open-Meteo.',
  mock: 'La previsión no está disponible en este momento; se muestran datos orientativos de ejemplo.',
};

function dayLabel(date: string): string {
  const d = new Date(date + 'T12:00:00');
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Hoy';
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(d, tomorrow)) return 'Mañana';
  return d.toLocaleDateString('es-ES', { weekday: 'short' });
}

function alarmIcon(kind: AlarmKind) {
  switch (kind) {
    case 'calor':
    case 'helada':
    case 'frio':
      return <ThermometerIcon width={16} height={16} />;
    case 'tormenta':
      return <LightningIcon width={16} height={16} />;
    case 'granizo':
      return <HailIcon width={16} height={16} />;
    case 'viento':
      return <WindIcon width={16} height={16} />;
    case 'lluvia':
      return <RainIcon width={16} height={16} />;
    case 'sequia':
      return <DropletIcon width={16} height={16} />;
    case 'aviso':
      return <AlertShieldIcon width={16} height={16} />;
  }
}

const AVISO_LABEL = { amarillo: 'Amarillo', naranja: 'Naranja', rojo: 'Rojo' } as const;
const CONSULT_LOCATION_KEY = 'tecrural-consult-location';
const CONSULT_LOCATION_EVENT = 'tecrural:consult-location';

function avisoRange(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WeatherWidget() {
  const [zone, setZone] = useState<'' | (typeof ZONES)[number]['id']>('');
  const [municipality, setMunicipality] = useState('');
  const [cropValue, setCropValue] = useState('');
  const [stage, setStage] = useState<'' | CropStageValue>('');
  const [stageTouched, setStageTouched] = useState(false);
  const [hectares, setHectares] = useState('1');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'ok' | 'error'>('idle');
  const [geoMsg, setGeoMsg] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const publishConsultLocation = useCallback(
    (nextZone: typeof zone, nextMunicipality: string) => {
      if (!nextZone || !nextMunicipality) return;
      const detail = { zone: nextZone, municipality: nextMunicipality };
      localStorage.setItem(CONSULT_LOCATION_KEY, JSON.stringify(detail));
      window.dispatchEvent(new CustomEvent(CONSULT_LOCATION_EVENT, { detail }));
    },
    []
  );

  const municipalities = useMemo(
    () => municipalitiesByZone(zone),
    [zone]
  );

  const crop = useMemo(() => findCrop(cropValue), [cropValue]);

  /** Fecha de hoy, refrescada a medianoche para que la fenología no quede obsoleta. */
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    const t = setTimeout(
      () => setToday(new Date()),
      nextMidnight.getTime() - now.getTime()
    );
    return () => clearTimeout(t);
  }, []);

  /** Fase fenológica deducida por cultivo + zona + fecha de hoy. */
  const deduced = useMemo(
    () => (cropValue && zone ? currentPhenology(cropValue, zone, today) : null),
    [cropValue, zone, today]
  );

  // Cuando aún no se ha elegido la etapa a mano, se sugiere automáticamente la
  // que corresponde a la fecha y la zona.
  useEffect(() => {
    if (!stageTouched && deduced) {
      setStage(deduced.kcStage);
    }
  }, [deduced, stageTouched]);

  const onZoneChange = (value: string) => {
    setZone(value as typeof zone);
    setMunicipality('');
    setWeather(null);
    setStatus('idle');
    setStage('');
    setStageTouched(false);
    setGeoStatus('idle');
    setGeoMsg('');
  };

  const onMunicipalityChange = (value: string) => {
    setMunicipality(value);
    setWeather(null);
    setStatus('idle');
    publishConsultLocation(zone, value);
  };

  const consult = useCallback(async () => {
    const place = findMunicipality(municipality);
    if (!place) {
      setStatus('error');
      setError('Selecciona tu municipio para consultar la información.');
      return;
    }
    setStatus('loading');
    setError('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(
        `/api/weather?municipality=${encodeURIComponent(place.name)}`,
        { cache: 'no-store', signal: controller.signal }
      );
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as WeatherData;
      setWeather(data);
      setStatus('ok');
      publishConsultLocation(place.zone, place.name);
      trackEvent('weather_consult_success', {
        source: 'weather_widget',
        municipality: place.name,
        zone: place.zone,
        weather_source: data.source,
      });
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch {
      clearTimeout(timer);
      setStatus('error');
      setError(
        'No se ha podido obtener el tiempo ahora mismo. Prueba de nuevo en unos minutos.'
      );
      trackEvent('weather_consult_error', {
        source: 'weather_widget',
        municipality: place.name,
        zone: place.zone,
      });
    }
  }, [municipality, publishConsultLocation]);

  const onGeo = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('error');
      setGeoMsg('Tu navegador no soporta la geolocalización.');
      return;
    }
    setGeoStatus('locating');
    setGeoMsg('');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 60000,
        });
      });
      const place = findNearestMunicipality(
        pos.coords.latitude,
        pos.coords.longitude
      );
      if (!place) {
        setGeoStatus('error');
        setGeoMsg('Tu ubicación no está en las zonas de trabajo (Altiplano o Costa Tropical).');
        return;
      }
      setZone(place.zone);
      setMunicipality(place.name);
      setWeather(null);
      setStatus('idle');
      setGeoStatus('ok');
      setGeoMsg(`Te hemos asignado ${place.name}.`);
      publishConsultLocation(place.zone, place.name);
      consult();
    } catch {
      setGeoStatus('error');
      setGeoMsg('No hemos podido obtener tu ubicación. Elígelo a mano.');
    }
  }, [consult, publishConsultLocation]);

  const risks = useMemo(
    () => (weather ? computeRisks(weather) : null),
    [weather]
  );
  const alarms = useMemo(
    () => (weather ? computeAlarms(weather, { crop }) : []),
    [weather, crop]
  );
  const activeAlerts = useMemo(
    () => alarms.filter((a) => a.level === 'alert'),
    [alarms]
  );
  const alertTitles = useMemo(
    () => alarms.filter((a) => a.level !== 'info').map((a) => a.title),
    [alarms]
  );
  const reco = useMemo(
    () => (weather ? getRecommendation(weather, crop) : null),
    [weather, crop]
  );

  const irri = useMemo(() => {
    if (!weather || !crop || !stage) return null;
    const ha = Number(hectares);
    return computeIrrigation(
      weather,
      crop,
      stage,
      Number.isFinite(ha) && ha > 0 ? ha : 1
    );
  }, [weather, crop, stage, hectares]);

  const hoursText = useMemo(() => {
    if (!irri) return null;
    const parts: string[] = [];
    if (irri.hours.morning) parts.push(irri.hours.morning);
    if (irri.hours.evening) parts.push(irri.hours.evening);
    return parts.length ? parts.join(' y ') : `sobre las ${irri.hours.best}`;
  }, [irri]);

  const waMessage = useMemo(() => {
    if (!weather || !reco) return null;
    const place = findMunicipality(municipality);
    const cropLabel = crop?.label ?? 'otro cultivo';
    return [
      `Hola ${businessName()}, he consultado la recomendación de hoy.`,
      ``,
      `- Zona: ${place?.name ?? municipality}`,
      `- Cultivo: ${cropLabel}${irri ? ` (${irri.stageLabel})` : ''}`,
      ...(deduced
        ? [`- Fase probable: ${deduced.main.label} (~${deduced.confidence}%)`]
        : []),
      `- Alertas: ${alertTitles.length ? alertTitles.join(', ') : 'sin alertas destacadas'}`,
      `- Recomendación: ${reco.title}`,
      ...(irri
        ? [
            `- Agua a regar: ${formatLitros(irri.liters)} litros (${irri.netMm.toFixed(1)} mm, ${formatLitros(irri.litersPerHa)} l/ha)`,
            `- Mejores horas: ${hoursText}`,
          ]
        : []),
      `Origen: resultado de consulta meteorológica`,
    ].join('\n');
  }, [weather, reco, municipality, crop, irri, hoursText, alertTitles, deduced]);

  const waLink = waMessage ? buildWhatsAppLink(waMessage) : null;
  const isMock = weather?.source === 'mock';
  return (
    <div id="consulta">
      <div className="card selector-card">
        <LocationSelector
          selectedZone={zone}
          selectedMunicipality={municipality}
          onZoneChange={onZoneChange}
          onMunicipalityChange={onMunicipalityChange}
          geoStatus={geoStatus}
          geoMsg={geoMsg}
          onGeo={onGeo}
          municipalities={municipalities}
        />

        <details
          className="advanced-options"
          open={advancedOpen}
          onToggle={(e) => {
            const isOpen = e.currentTarget.open;
            setAdvancedOpen(isOpen);
            if (isOpen) {
              trackEvent('advanced_options_open', {
                source: 'weather_widget',
                municipality,
                zone,
              });
            }
          }}
        >
          <summary>Ajustar por cultivo <span>(opcional)</span></summary>
          <div className="advanced-options-body">
            <div className="field">
              <label htmlFor="crop">Tu cultivo</label>
              <div className="select-wrap">
                <select
                  id="crop"
                  value={cropValue}
                  onChange={(e) => {
                    setCropValue(e.target.value);
                    setStage('');
                    setStageTouched(false);
                    if (e.target.value) setAdvancedOpen(true);
                  }}
                >
                  <option value="">Elige tu cultivo…</option>
                  {CROPS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="hint">
                Añádelo para recibir una recomendación de riego más ajustada.
              </p>
            </div>

            <div className="field">
              <label htmlFor="stage">Etapa del cultivo</label>
              <div className="select-wrap">
                <select
                  id="stage"
                  value={stage}
                  onChange={(e) => {
                    setStage(e.target.value as typeof stage);
                    setStageTouched(true);
                  }}
                  disabled={!cropValue}
                >
                  <option value="">
                    {cropValue ? 'Elige la etapa…' : 'Primero elige tu cultivo'}
                  </option>
                  {CROP_STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="hint">
                {CROP_STAGES.find((s) => s.value === stage)?.hint ??
                  'Según la etapa, la planta gasta más o menos agua.'}
              </p>
              {deduced && (
                <div className="pheno-suggest">
                  <span className="pheno-badge">Auto</span>
                  <span>
                    <strong>
                      Fase probable el {formatDateLong(today)}:{' '}
                      {deduced.main.label}
                    </strong>{' '}
                    ({deduced.confidence}% de probabilidad).
                    {stageTouched &&
                      stage !== deduced.kcStage &&
                      ' Has elegido otra etapa manualmente.'}
                  </span>
                  <span className="pheno-reason">{deduced.reason}</span>
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="hectares">Hectáreas regadas</label>
              <input
                id="hectares"
                type="number"
                inputMode="decimal"
                min="0.1"
                step="0.5"
                value={hectares}
                onChange={(e) => setHectares(e.target.value)}
              />
              <p className="hint">
                Se usa para calcular los litros totales de tu finca.
              </p>
            </div>
          </div>
        </details>

        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={consult}
          disabled={status === 'loading'}
          type="button"
        >
          {status === 'loading' ? 'Consultando…' : 'Consultar mi zona'}
        </button>
      </div>

      {status === 'loading' && (
        <>
          <div className="status" role="status">
            <span className="spinner" aria-hidden="true" />
            Obteniendo el tiempo de tu zona…
          </div>
          <div className="skeleton-card" aria-hidden="true">
            <div className="skeleton-head">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-chip" />
            </div>
            <div className="skeleton-main">
              <div className="skeleton skeleton-big" />
              <div className="skeleton skeleton-small" />
              <div className="skeleton skeleton-small" />
            </div>
            <div className="skeleton-cols">
              <div className="skeleton skeleton-block" />
              <div className="skeleton skeleton-block" />
            </div>
            <div className="skeleton skeleton-reco" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short hint-mt" />
          </div>
        </>
      )}

      {status === 'error' && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {status === 'ok' && weather && risks && reco && (
        <div ref={resultsRef} className="card results-card">
          <div className="results-head">
            <h3 className="results-title">
              Tiempo en {municipality}
            </h3>
            <span
              className={`source-badge ${isMock ? 'mock' : 'real'}`}
              title={SOURCE_TITLE[weather.source]}
            >
              {SOURCE_LABEL[weather.source]}
            </span>
          </div>

          <div className="weather-grid">
            <div className="weather-main">
              <div>
                <div className="temp-now">
                  {Math.round(weather.current.temperature)}
                  <small> °C</small>
                </div>
                <div className="weather-sub">
                  Sensación{' '}
                  {Math.round(weather.current.apparentTemperature)} °C ·{' '}
                  {weather.current.condition ??
                    weatherCodeToLabel(weather.current.weatherCode)}
                </div>
              </div>
              <div className="weather-right">
                <div className="weather-label">
                  {weather.current.isDay ? 'Día' : 'Noche'}
                </div>
                <div className="weather-sub">
                  Máx{' '}
                  {Math.round(weather.daily[0]?.tempMax ?? weather.current.temperature)}{' '}
                  °C · Mín{' '}
                  {Math.round(weather.daily[0]?.tempMin ?? weather.current.temperature)}{' '}
                  °C
                </div>
              </div>
            </div>

            <dl className="metric">
              <dt className="metric-top">
                <DropletIcon width={16} height={16} /> Humedad
              </dt>
              <dd className="metric-value">
                {Math.round(weather.current.humidity)}
                <small> %</small>
              </dd>
            </dl>

            <dl className="metric">
              <dt className="metric-top">
                <WindIcon width={16} height={16} /> Viento
              </dt>
              <dd className="metric-value">
                {Math.round(weather.current.windSpeed)}
                <small> km/h</small>
              </dd>
            </dl>

            <dl className="metric">
              <dt className="metric-top">
                <RainIcon width={16} height={16} /> Lluvia hoy
              </dt>
              <dd className="metric-value">
                {weather.daily[0]?.precipitation.toFixed(1)}
                <small> mm</small>
              </dd>
            </dl>

            <dl className="metric">
              <dt className="metric-top">
                <ThermometerIcon width={16} height={16} /> Rachas
              </dt>
              <dd className="metric-value">
                {Math.round(weather.current.windGusts)}
                <small> km/h</small>
              </dd>
            </dl>

            <div className="forecast">
              <div className="metric-top">Previsión de los próximos días</div>
              <div className="forecast-days">
                {weather.daily.map((d) => (
                  <div className="forecast-day" key={d.date}>
                    <div className="day">{dayLabel(d.date)}</div>
                    <div className="t-range">
                      {Math.round(d.tempMin)}° / {Math.round(d.tempMax)}°
                    </div>
                    <div className="rain">
                      {d.precipitationProbability}% · {d.precipitation.toFixed(1)} mm
                    </div>
                    {d.condition && (
                      <div className="cond">
                        {d.condition}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {activeAlerts.length > 0 && (
            <div className="alarm-banner priority-alert" role="alert">
              <LightningIcon width={24} height={24} />
              <div>
                <strong>Alerta hoy:</strong>{' '}
                {activeAlerts.map((a) => a.title).join(' · ')}
              </div>
            </div>
          )}

          {weather.avisos && weather.avisos.length > 0 && (
            <section className="priority-notices" aria-label="Avisos oficiales">
              <h3 className="section-title">Avisos oficiales de AEMET</h3>
              <div className="avisos">
                {weather.avisos.map((a, i) => (
                  <div className={`aviso ${a.nivel}`} key={`aviso-${i}`}>
                    <div className="aviso-head">
                      <span className="aviso-badge">{AVISO_LABEL[a.nivel]}</span>
                      <span className="aviso-title">
                        {a.fenomeno}
                        {a.valor ? ` · ${a.valor}` : ''}
                      </span>
                    </div>
                    <div className="aviso-zona">{a.zona}</div>
                    {(a.inicio || a.fin) && (
                      <div className="aviso-range">
                        {a.inicio && `Desde ${avisoRange(a.inicio)}`}
                        {a.inicio && a.fin && ' · '}
                        {a.fin && `hasta ${avisoRange(a.fin)}`}
                      </div>
                    )}
                    {a.descripcion && (
                      <div className="aviso-desc">{a.descripcion}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className={`reco ${reco.level}`}>
            <div className="reco-title">{reco.title}</div>
            <p className="reco-message">{reco.message}</p>
            <div className="reco-advice">{reco.advice}</div>
          </div>

          <div className="context-lead-cta">
            <div>
              <strong>Recibe estos avisos en WhatsApp para {municipality}</strong>
              <p>
                Te avisamos de calor, heladas, viento o lluvia sin que tengas que consultar la web.
              </p>
            </div>
            <a className="btn btn-wa" href="#contacto">
              Activar avisos
            </a>
          </div>

           {deduced && (
            <>
              <h3 className="section-title">
                 Etapa del cultivo estimada
              </h3>
              <div className="pheno-card">
                <div className="pheno-main">
                  <span className="pheno-stage">{deduced.main.label}</span>
                  <span className="pheno-conf">
                    {deduced.cropLabel} · {formatDateLong(today)} · ~
                    {deduced.confidence}% de las fincas
                  </span>
                </div>
                <p className="pheno-reason">{deduced.reason}</p>
                <p className="hint hint-mt">
                   Etapa usada para ajustar el riego:{' '}
                  <strong>
                    {CROP_STAGES.find((s) => s.value === deduced.kcStage)
                      ?.label ?? deduced.kcStage}
                  </strong>
                  {stageTouched && stage !== deduced.kcStage
                    ? ` · tienes elegida "${CROP_STAGES.find((s) => s.value === stage)?.label}" manualmente`
                    : ''}
                </p>
              </div>
            </>
          )}

          <h3 className="section-title">
            Riesgos previstos para el cultivo
          </h3>
          <div className="risks">
            {(Object.keys(risks) as (keyof typeof risks)[]).map((key) => {
              const risk = risks[key];
              return (
                <div className={`risk ${risk.level}`} key={key}>
                  <div className="risk-dot" aria-hidden="true" />
                  <div className="risk-label">{risk.label}</div>
                  <div className="risk-level">{RISK_LABEL[risk.level]}</div>
                  <div className="risk-hint">{risk.hint}</div>
                </div>
              );
            })}
          </div>

           <h3 className="section-title">
            Alertas meteorológicas
          </h3>
          <p className="hint hint-mt">
            Los riesgos se clasifican como bajo, medio o alto. Los avisos
            oficiales de AEMET aparecen como alertas independientes.
          </p>

          {alarms.length === 0 ? (
            <p className="hint hint-mt">
              Sin alertas destacadas hoy en tu zona.
            </p>
          ) : (
            <div className="alarms">
              {alarms.map((a, idx) => (
                <div className={`alarm ${a.level}`} key={`${a.kind}-${idx}`}>
                  <div className="alarm-head">
                    <span className="alarm-icon">{alarmIcon(a.kind)}</span>
                    <span className="alarm-title">{a.title}</span>
                    {a.at && <span className="alarm-at">{a.at}</span>}
                    <span className="alarm-level">
                      {a.level === 'alert'
                        ? 'Alerta'
                        : a.level === 'warning'
                          ? 'Atención'
                          : 'Aviso'}
                    </span>
                  </div>
                  <p className="alarm-message">{a.message}</p>
                  <div className="alarm-advice">{a.advice}</div>
                </div>
              ))}
            </div>
          )}

          <h3 className="section-title">
            Riego: agua y mejores horas
          </h3>

          {!irri ? (
            <p className="hint hint-mt">
              Elige tu <strong>cultivo</strong> y su <strong>etapa</strong> en
              el formulario para calcular cuánta agua regar y cuándo es mejor
              hacerlo.
            </p>
          ) : (
            <div className="irri">
              {(reco.level === 'avoid-heat' || reco.level === 'avoid-wind') && (
                <div className="error-box inline" role="alert">
                  Hoy es mejor <strong>no regar</strong> por{' '}
                  {reco.level === 'avoid-heat' ? 'el calor extremo' : 'el viento fuerte'}.
                  Si es imprescindible, usa las horas indicadas y riego por goteo.
                </div>
              )}

              <div className="irri-grid">
                <dl className="metric irri-main">
                  <dt className="metric-top">
                    <DropletIcon width={16} height={16} /> Agua a regar hoy
                  </dt>
                  <dd className="metric-value">
                    {formatLitros(irri.liters)}
                    <small> litros</small>
                    <div className="irri-sub">
                      en tu finca de {irri.hectares} ha
                    </div>
                  </dd>
                </dl>

                <dl className="metric">
                  <dt className="metric-top">Por hectárea</dt>
                  <dd className="metric-value">
                    {formatLitros(irri.litersPerHa)}
                    <small> l/ha</small>
                    <div className="irri-sub">
                      {irri.netMm.toFixed(1)} mm de agua neta
                    </div>
                  </dd>
                </dl>

                <dl className="metric">
                  <dt className="metric-top">Necesidad del cultivo</dt>
                  <dd className="metric-value">
                    {irri.etc.toFixed(1)}
                    <small> mm</small>
                     <div className="irri-sub">
                       Estimación según el cultivo, su etapa y el tiempo previsto
                     </div>
                  </dd>
                </dl>

                <dl className="metric">
                  <dt className="metric-top">
                    <RainIcon width={16} height={16} /> Lluvia aprovechable
                  </dt>
                  <dd className="metric-value">
                    {irri.rain.toFixed(1)}
                    <small> mm</small>
                    <div className="irri-sub">
                      {irri.coveredByRain
                        ? 'la lluvia cubre la necesidad'
                        : 'restada de la necesidad del cultivo'}
                    </div>
                  </dd>
                </dl>
              </div>

              <div className="hours-box">
                <div className="metric-top">
                  <ClockIcon width={16} height={16} /> Mejores horas para regar
                </div>
                <div className="hours-row">
                  {irri.hours.morning && (
                    <span className="hour-chip">
                      Mañana {irri.hours.morning}
                    </span>
                  )}
                  {irri.hours.evening && (
                    <span className="hour-chip">
                      Tarde/noche {irri.hours.evening}
                    </span>
                  )}
                  <span className="hour-chip hour-chip-best">
                    Mejor hora {irri.hours.best}
                  </span>
                </div>
                {irri.hours.reasons.length > 0 && (
                  <ul className="irri-reasons">
                    {irri.hours.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>

               <p className="irri-note">{irri.note}</p>
               <details className="technical-detail">
                 <summary>Ver cálculo técnico</summary>
                 <p>
                   Usamos la evapotranspiración de referencia (ET0) y el
                   coeficiente del cultivo (Kc) según su etapa: ET0{' '}
                   {irri.et0.toFixed(1)} × Kc {irri.kc.toFixed(2)} ={' '}
                   {irri.etc.toFixed(1)} mm.
                 </p>
               </details>
            </div>
          )}

          {waLink && (
            <TrackedWhatsAppLink
              className="btn btn-wa btn-block wa-cta-block"
              href={waLink}
              source="weather_results"
            >
              <WhatsAppIcon /> Hablar con {businessName()}
            </TrackedWhatsAppLink>
          )}

          <p className="updated-note">
            Consulta de {new Date(weather.updatedAt).toLocaleString('es-ES')} ·
            Los datos se actualizan cada 15 minutos.
          </p>
        </div>
      )}
    </div>
  );
}
