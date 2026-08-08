import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { runAlertChecks } from '@/lib/notify';

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const dryRun = body?.dryRun !== false;

  try {
    const result = await runAlertChecks({ dryRun });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin] error en el envío de alertas:', err);
    return NextResponse.json(
      { error: 'No se pudieron comprobar las alertas.' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
