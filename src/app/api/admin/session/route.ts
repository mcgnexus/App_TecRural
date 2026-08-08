import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  isAuthenticated,
  sessionConfigured,
  verifyPassword,
  buildSessionCookie,
} from '@/lib/admin-auth';

export async function GET() {
  if (isAuthenticated()) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false });
}

export async function POST(request: Request) {
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
