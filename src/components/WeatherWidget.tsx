'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { WeatherData } from '@/lib/weather';
import { weatherCodeToLabel } from '@/lib/weather';
import { computeRisks, getRecommendation } from '@/lib/recommendations';
import type { RiskLevel } from '@/lib/weather';
import { ZONES, municipalitiesByZone, findMunicipality } from '@/lib/municipalities';
import { CROPS, findCrop } from '@/lib/crops';
import { buildWhatsAppLink, businessName } from '@/lib/wa';
import {
  SunIcon,
  DropletIcon,
  WindIcon,
  RainIcon,
  ThermometerIcon,
  WhatsAppIcon,
} from './icons';

type Status = 'idle' | 'loading' | 'ok' | 'error';

const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
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

export default function WeatherWidget() {
  const [zone, setZone] = useState<'' | (typeof ZONES)[number]['id']>('');
  const [municipality, setMunicipality] = useState('');
  const [cropValue, setCropValue] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const municipalities = useMemo(
    () => municipalitiesByZone(zone),
    [zone]
  );

  const crop = useMemo(() => findCrop(cropValue), [cropValue]);

  const onZoneChange = (value: string) => {
    setZone(value as typeof zone);
    setMunicipality('');
    setWeather(null);
    setStatus('idle');
  };

  const onMunicipalityChange = (value: string) => {
    setMunicipality(value);
    setWeather(null);
    setStatus('idle');
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
    try {
      const res = await fetch(
        `/api/weather?lat=${encodeURIComponent(place.lat)}&lon=${encodeURIComponent(place.lon)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as WeatherData;
      setWeather(data);
      setStatus('ok');
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch {
      setStatus('error');
      setError(
        'No se ha podido obtener el tiempo ahora mismo. Prueba de nuevo en unos minutos.'
      );
    }
  }, [municipality]);

  const risks = useMemo(
    () => (weather ? computeRisks(weather) : null),
    [weather]
  );
  const reco = useMemo(
    () => (weather ? getRecommendation(weather, crop) : null),
    [weather, crop]
  );

  const waMessage = useMemo(() => {
    if (!weather || !reco) return null;
    const place = findMunicipality(municipality);
    const cropLabel = crop?.label ?? 'otro cultivo';
    return [
      `Hola ${businessName()}, he consultado la recomendación de hoy.`,
      ``,
      `- Zona: ${place?.name ?? municipality}`,
      `- Cultivo: ${cropLabel}`,
      `- Recomendación: ${reco.title}`,
    ].join('\n');
  }, [weather, reco, municipality, crop]);

  const waLink = waMessage ? buildWhatsAppLink(waMessage) : null;
  const isMock = weather?.source === 'mock';

  return (
    <div id="consulta">
      <div className="card selector-card">
        <div className="field">
          <label htmlFor="zone">Tu zona</label>
          <div className="select-wrap">
            <select
              id="zone"
              value={zone}
              onChange={(e) => onZoneChange(e.target.value)}
            >
              <option value="">Elige tu zona…</option>
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="municipality">Tu municipio</label>
          <div className="select-wrap">
            <select
              id="municipality"
              value={municipality}
              onChange={(e) => onMunicipalityChange(e.target.value)}
              disabled={!zone}
            >
              <option value="">
                {zone ? 'Elige tu municipio…' : 'Primero elige tu zona'}
              </option>
              {municipalities.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="crop">Tu cultivo</label>
          <div className="select-wrap">
            <select
              id="crop"
              value={cropValue}
              onChange={(e) => setCropValue(e.target.value)}
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
            La recomendación se ajusta al tipo de cultivo y al clima local de tu
            municipio.
          </p>
        </div>

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
        <div className="status" role="status">
          <span className="spinner" aria-hidden="true" />
          Obteniendo el tiempo de tu zona…
        </div>
      )}

      {status === 'error' && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {status === 'ok' && weather && risks && reco && (
        <div ref={resultsRef} className="card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
            <h3 style={{ color: 'var(--green-dark)' }}>
              Tiempo en {municipality}
            </h3>
            {isMock && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted)',
                  background: 'var(--cloud)',
                  borderRadius: 999,
                  padding: '3px 10px',
                }}
                title="La previsión no está disponible en este momento; se muestran datos orientativos de ejemplo."
              >
                Datos orientativos
              </span>
            )}
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
                  {weatherCodeToLabel(weather.current.weatherCode)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
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

            <div className="metric">
              <div className="metric-top">
                <DropletIcon width={16} height={16} /> Humedad
              </div>
              <div className="metric-value">
                {Math.round(weather.current.humidity)}
                <small> %</small>
              </div>
            </div>

            <div className="metric">
              <div className="metric-top">
                <WindIcon width={16} height={16} /> Viento
              </div>
              <div className="metric-value">
                {Math.round(weather.current.windSpeed)}
                <small> km/h</small>
              </div>
            </div>

            <div className="metric">
              <div className="metric-top">
                <RainIcon width={16} height={16} /> Lluvia hoy
              </div>
              <div className="metric-value">
                {weather.daily[0]?.precipitation.toFixed(1)}
                <small> mm</small>
              </div>
            </div>

            <div className="metric">
              <div className="metric-top">
                <ThermometerIcon width={16} height={16} /> Rachas
              </div>
              <div className="metric-value">
                {Math.round(weather.current.windGusts)}
                <small> km/h</small>
              </div>
            </div>

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
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h3 style={{ color: 'var(--green-dark)', marginTop: 22 }}>
            Riesgos para el cultivo
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

          <div className={`reco ${reco.level}`}>
            <div className="reco-title">{reco.title}</div>
            <p className="reco-message">{reco.message}</p>
            <div className="reco-advice">{reco.advice}</div>
          </div>

          {waLink && (
            <a
              className="btn btn-wa btn-block"
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: 18 }}
            >
              <WhatsAppIcon /> Hablar con {businessName()}
            </a>
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
