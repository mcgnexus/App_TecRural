import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { deleteLead, markResponded } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Identificador no válido.' }, { status: 400 });
  }
  const ok = await deleteLead(id);
  if (!ok) {
    return NextResponse.json({ error: 'Contacto no encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Identificador no válido.' }, { status: 400 });
  }
  const ok = await markResponded(id);
  if (!ok) {
    return NextResponse.json({ error: 'Contacto no encontrado o ya respondido.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';
