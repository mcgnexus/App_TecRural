import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  isAuthenticated,
  sessionConfigured,
  verifyPassword,
  buildSessionCookie,
} from '@/lib/admin-auth';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export async function GET() {
  if (isAuthenticated()) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false });
}

export async function POST(request: Request) {
  const rateCheck = checkRateLimit(
    `admin-session:${clientIp(request)}`,
    10,
    15 * 60 * 1000
  );
  if (!rateCheck.ok) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Inténtalo más tarde.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) },
      }
    );
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (!sessionConfigured()) {
    return NextResponse.json(
      { error: 'El panel no está configurado. Define ADMIN_PASSWORD en .env.local.' },
      { status: 500 }
    );
  }

  if (verifyPassword(password)) {
    const store = cookies();
    const session = buildSessionCookie();
    store.set(session.name, session.value, session.options);
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 });
}

export async function DELETE() {
  const store = cookies();
  store.delete('tecrural_admin');
  return NextResponse.json({ authenticated: false });
}

export const dynamic = 'force-dynamic';
