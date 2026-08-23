import { NextResponse } from 'next/server';
import { createLead } from '@/lib/db';
import { findMunicipality } from '@/lib/municipalities';
import { CROPS, FARM_SIZES, PROBLEMS } from '@/lib/crops';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

const PHONE_RE = /^\+?[0-9\s().-]{6,20}$/;

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 9 && digits.length <= 15 && PHONE_RE.test(phone);
}

export async function POST(request: Request) {
  try {
    const rateCheck = checkRateLimit(
      `leads:${clientIp(request)}`,
      20,
      60 * 60 * 1000
    );
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Inténtalo más tarde.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) } }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Datos no válidos.' },
        { status: 400 }
      );
    }

    // Honeypot anti-spam: los robots rellenan campos ocultos.
    if (body.website) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const municipality = String(body.municipality ?? '').trim();
    const crop = String(body.crop ?? '').trim();
    const farmSize = String(body.farmSize ?? '').trim();
    const problem = String(body.problem ?? '').trim();
    const alertsConsent = body.alertsConsent === true;
    const marketingConsent = body.marketingConsent === true;

    const errors: Record<string, string> = {};
    if (!name || name.length < 2 || name.length > 120) {
      errors.name = 'Escribe tu nombre.';
    }
    if (!isValidPhone(phone)) {
      errors.phone = 'Escribe un teléfono válido (9-15 dígitos).';
    }
    if (!findMunicipality(municipality)) {
      errors.municipality = 'Selecciona tu municipio de la lista.';
    }
    if (!alertsConsent) {
      errors.alertsConsent =
        'Debes aceptar recibir los avisos agrícolas por WhatsApp.';
    }
    if (crop && !CROPS.some((c) => c.value === crop)) {
      errors.crop = 'Selecciona un cultivo.';
    }
    if (farmSize && !FARM_SIZES.some((f) => f.value === farmSize)) {
      errors.farmSize = 'Selecciona un tamaño de finca válido.';
    }
    if (problem && !PROBLEMS.some((p) => p.value === problem)) {
      errors.problem = 'Selecciona un problema válido.';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const lead = await createLead({
      name,
      phone,
      municipality,
      crop,
      farmSize,
      problem,
      alertsConsent,
      marketingConsent,
    });

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (err) {
    console.error('[leads] error al guardar:', err);
    return NextResponse.json(
      { error: 'No se pudo guardar el contacto. Inténtalo de nuevo.' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
