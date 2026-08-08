import { NextResponse } from 'next/server';
import { isAuthenticated } from '../session/route';
import { countLeads, listLeads } from '@/lib/db';

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  try {
    const [leads, total] = await Promise.all([listLeads(), countLeads()]);
    return NextResponse.json({ leads, total });
  } catch (err) {
    console.error('[admin] error al listar contactos:', err);
    return NextResponse.json(
      { error: 'No se pudieron cargar los contactos.' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
