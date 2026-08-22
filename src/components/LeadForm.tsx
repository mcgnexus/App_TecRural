'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ZONES, municipalitiesByZone, type ZoneId } from '@/lib/municipalities';
import { CROPS, FARM_SIZES, PROBLEMS } from '@/lib/crops';
import { businessName } from '@/lib/wa';
import { trackEvent } from './Analytics';

type Errors = Record<string, string>;
type ConsultLocation = { zone: ZoneId; municipality: string };

const CONSULT_LOCATION_KEY = 'tecrural-consult-location';
const CONSULT_LOCATION_EVENT = 'tecrural:consult-location';

export default function LeadForm() {
  const [zone, setZone] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    municipality: '',
    crop: '',
    farmSize: '',
    problem: '',
  });
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');
  const [cameFromConsult, setCameFromConsult] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const applyConsultLocation = useCallback((location: ConsultLocation) => {
    setZone(location.zone);
    setForm((f) => ({ ...f, municipality: location.municipality }));
    setErrors((er) => ({ ...er, municipality: '' }));
    setCameFromConsult(true);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(CONSULT_LOCATION_KEY);
    if (raw) {
      try {
        const location = JSON.parse(raw) as ConsultLocation;
        if (location.zone && location.municipality) {
          applyConsultLocation(location);
        }
      } catch {
        localStorage.removeItem(CONSULT_LOCATION_KEY);
      }
    }

    const onConsultLocation = (event: Event) => {
      const { detail } = event as CustomEvent<ConsultLocation>;
      if (detail?.zone && detail?.municipality) {
        applyConsultLocation(detail);
      }
    };

    window.addEventListener(CONSULT_LOCATION_EVENT, onConsultLocation);
    return () => window.removeEventListener(CONSULT_LOCATION_EVENT, onConsultLocation);
  }, [applyConsultLocation]);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErrors((er) => ({ ...er, [field]: '' }));
    };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = 'Escribe tu nombre.';
    const phone = form.phone.trim();
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    if (!/^[+0-9\s().-]{6,20}$/.test(phone) || phoneDigits.length < 9 || phoneDigits.length > 15)
      next.phone = 'Escribe un teléfono válido.';
    if (!form.municipality) next.municipality = 'Selecciona tu municipio.';
    if (!privacyAccepted) next.privacy = 'Debes aceptar la política de privacidad.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      trackEvent('lead_submit_error', {
        source: 'contact_form',
        reason: 'validation',
        fields: Object.keys(next).join(','),
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, website, privacyAccepted }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.errors) {
          setErrors(data.errors);
          trackEvent('lead_submit_error', {
            source: 'contact_form',
            reason: 'backend_validation',
            fields: Object.keys(data.errors).join(','),
          });
        } else {
          setServerError(data?.error || 'No se pudo enviar. Inténtalo de nuevo.');
          trackEvent('lead_submit_error', {
            source: 'contact_form',
            reason: 'server',
            status: res.status,
          });
        }
        return;
      }
      trackEvent('lead_submit_success', {
        source: 'contact_form',
        municipality: form.municipality,
        zone,
        came_from_consult: cameFromConsult,
      });
      setDone(true);
    } catch {
      setServerError('No se pudo enviar. Comprueba tu conexión e inténtalo de nuevo.');
      trackEvent('lead_submit_error', {
        source: 'contact_form',
        reason: 'network',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const municipalities = municipalitiesByZone(
    zone as (typeof ZONES)[number]['id'] | ''
  );

  const nameField = (
    <div className="field">
      <label htmlFor="lead-name">Nombre</label>
      <input
        id="lead-name"
        type="text"
        autoComplete="name"
        value={form.name}
        onChange={set('name')}
        placeholder="Tu nombre"
        className={errors.name ? 'invalid' : undefined}
      />
      {errors.name && <div className="field-error">{errors.name}</div>}
    </div>
  );

  const phoneField = (
    <div className="field">
      <label htmlFor="lead-phone">Teléfono WhatsApp</label>
      <span className="field-hint">Solo WhatsApp. No llamadas comerciales.</span>
      <input
        id="lead-phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        value={form.phone}
        onChange={set('phone')}
        placeholder="600 000 000"
        className={errors.phone ? 'invalid' : undefined}
        aria-invalid={Boolean(errors.phone)}
      />
      {errors.phone && <div className="field-error">{errors.phone}</div>}
    </div>
  );

  const locationFields = (
    <>
      <div className="field">
        <label htmlFor="lead-zone">Zona</label>
        <div className="select-wrap">
          <select
            id="lead-zone"
            value={zone}
            onChange={(e) => {
              setZone(e.target.value);
              setForm((f) => ({ ...f, municipality: '' }));
              setErrors((er) => ({ ...er, municipality: '' }));
              setCameFromConsult(false);
            }}
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
        <label htmlFor="lead-municipality">Municipio</label>
        <div className="select-wrap">
          <select
            id="lead-municipality"
            value={form.municipality}
            onChange={(e) => {
              set('municipality')(e);
              setCameFromConsult(false);
            }}
            disabled={!zone}
            className={errors.municipality ? 'invalid' : undefined}
            aria-invalid={Boolean(errors.municipality)}
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
        {errors.municipality && (
          <div className="field-error">{errors.municipality}</div>
        )}
      </div>
    </>
  );

  if (done) {
    return (
      <div className="card form-card form-success">
        <h3>¡Gracias por confiar en {businessName()}!</h3>
        <p>
          Hemos recibido tu solicitud. En breve nos pondremos en contacto para
          contarte cómo recibir los avisos agrícolas.
        </p>
      </div>
    );
  }

  return (
    <form className="card form-card" onSubmit={onSubmit} noValidate>
      {nameField}
      {cameFromConsult ? locationFields : phoneField}
      {cameFromConsult ? phoneField : locationFields}

      <details className="advanced-options">
        <summary>
          Más sobre tu finca <span>(opcional)</span>
        </summary>
        <div className="advanced-options-body">
          <div className="form-row">
            <div className="field">
              <label htmlFor="lead-crop">Cultivo principal</label>
              <div className="select-wrap">
                <select
                  id="lead-crop"
                  value={form.crop}
                  onChange={set('crop')}
                  className={errors.crop ? 'invalid' : undefined}
                  aria-invalid={Boolean(errors.crop)}
                >
                  <option value="">Elige…</option>
                  {CROPS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors.crop && <div className="field-error">{errors.crop}</div>}
            </div>

            <div className="field">
              <label htmlFor="lead-size">Tamaño de la finca</label>
              <div className="select-wrap">
                <select
                  id="lead-size"
                  value={form.farmSize}
                  onChange={set('farmSize')}
                >
                  <option value="">Opcional…</option>
                  {FARM_SIZES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="lead-problem">Problema o interés principal</label>
            <div className="select-wrap">
              <select
                id="lead-problem"
                value={form.problem}
                onChange={set('problem')}
              >
                <option value="">Selecciona uno…</option>
                {PROBLEMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </details>

      {/* Honeypot anti-spam: los humanos no ven este campo */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="lead-website">No rellenes este campo</label>
        <input
          id="lead-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {serverError && <div className="error-box">{serverError}</div>}

      <div className="privacy-consent">
        <label htmlFor="lead-privacy">
          <input
            id="lead-privacy"
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => {
              setPrivacyAccepted(e.target.checked);
              setErrors((er) => ({ ...er, privacy: '' }));
            }}
            aria-invalid={Boolean(errors.privacy)}
          />
          <span>
            Acepto la{' '}
            <a href="/politica-privacidad" target="_blank" rel="noreferrer">
              política de privacidad
            </a>
            .
          </span>
        </label>
        {errors.privacy && <div className="field-error">{errors.privacy}</div>}
      </div>

      <div className="form-actions">
        <button
          className="btn btn-primary btn-block btn-lg"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Enviando…' : 'Quiero recibir avisos por WhatsApp'}
        </button>
        <p className="hint form-note">
          Te escribimos por WhatsApp. Sin llamadas comerciales.
        </p>
      </div>
    </form>
  );
}
