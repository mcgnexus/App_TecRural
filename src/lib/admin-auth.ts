import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'tecrural_admin';

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

export const COOKIE_MAX_AGE = 60 * 60 * 12; // 12 horas

export function buildSessionCookie(): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: 'lax';
    secure: boolean;
    path: string;
    maxAge: number;
  };
} {
  return {
    name: COOKIE_NAME,
    value: hash(secret()),
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    },
  };
}

export function sessionConfigured(): boolean {
  return secret() !== '' && secret() !== 'cambia-esta-clave';
}

export function verifyPassword(password: string): boolean {
  return (
    typeof password === 'string' &&
    password.length > 0 &&
    hash(password) === hash(secret())
  );
}
