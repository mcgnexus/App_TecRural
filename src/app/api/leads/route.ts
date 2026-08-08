import { NextResponse } from 'next/server';
import { createLead } from '@/lib/db';
import { findMunicipality } from '@/lib/municipalities';
import { CROPS, FARM_SIZES, PROBLEMS } from '@/lib/crops';

const PHONE_RE = /^\+?[0-9\s().-]{6,20}$/;

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 9 && digits.length <= 15 && PHONE_RE.test(phone);
}

/** Límite sencillo en memoria para evitar abuso del formulario (10/h por IP). */
const rateHits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hit = rateHits.get(ip);
  if (!hit || hit.resetAt < now) {
    rateHits.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  if (hit.count > 10) {
    rateHits.delete(ip);
    return false;
  }
  return true;
}

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'
  );
}

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(clientIp(request))) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Inténtalo más tarde.' },
        { status: 429 }
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
    if (!CROPS.some((c) => c.value === crop)) {
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
