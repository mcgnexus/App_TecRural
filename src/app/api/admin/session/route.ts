import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'tecrural_admin';
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12 horas

function secret(): string {
  return process.env.ADMIN_PASSWORD || '';
}

function hash(secretValue: string): string {
  return crypto
    .createHmac('sha256', 'tecrural-session')
    .update(secretValue)
    .digest('hex');
}

export function isAuthenticated(): boolean {
  const store = cookies();
  const cookie = store.get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  return cookie === hash(secret());
}

export async function GET() {
  if (isAuthenticated()) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = body?.password;
  const configured = secret();

  if (!configured || configured === 'cambia-esta-clave') {
    return NextResponse.json(
      { error: 'El panel no está configurado. Define ADMIN_PASSWORD en .env.local.' },
      { status: 500 }
    );
  }

  if (typeof password === 'string' && password.length > 0 && hash(password) === hash(configured)) {
    const store = cookies();
    store.set(COOKIE_NAME, hash(configured), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 });
}

export async function DELETE() {
  const store = cookies();
  store.delete(COOKIE_NAME);
  return NextResponse.json({ authenticated: false });
}

export const dynamic = 'force-dynamic';
