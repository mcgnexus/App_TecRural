import { NextResponse } from 'next/server';
import { runAlertChecks } from '@/lib/notify';

/**
 * Arranca (una sola vez) el planificador de avisos: revisa el tiempo de los
 * contactos cada ALERTS_INTERVAL_MIN minutos y envía las alertas del día.
 * Se llama automáticamente desde src/instrumentation.ts al arrancar el
 * servidor y también se puede invocar manualmente desde /admin.
 */
let started = false;
let running = false;

function ensureScheduler(): void {
  if (started) return;
  started = true;

  const minutes = Math.max(
    5,
    Number(process.env.ALERTS_INTERVAL_MIN || 30) || 30
  );

  const run = async () => {
    if (running) return;
    running = true;
    try {
      await runAlertChecks({ dryRun: false });
    } catch (err) {
      console.error('[alerts]', err);
    } finally {
      running = false;
    }
  };

  run();
  setInterval(run, minutes * 60 * 1000);
  console.log(`[alerts] planificador activo: revisión cada ${minutes} minutos.`);
}

export async function GET() {
  if (process.env.ALERTS_ENABLED === 'true') {
    ensureScheduler();
    return NextResponse.json({ started: true });
  }
  return NextResponse.json({ started: false });
}

export const dynamic = 'force-dynamic';
