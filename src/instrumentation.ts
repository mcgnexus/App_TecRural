/**
 * Arranque del servidor (Node.js).
 *
 * Si ALERTS_ENABLED=true, pide a la ruta interna /api/alerts/schedule que
 * arranque el planificador de avisos (primera revisión + intervalo). No se
 * importa código de la aplicación aquí para no empaquetar módulos nativos
 * en el bundle de instrumentation.
 */
import { SITE_URL } from '@/lib/site';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.ALERTS_ENABLED !== 'true') return;

  const base = SITE_URL;
  fetch(`${base}/api/alerts/schedule`).catch((err) =>
    console.warn('[alerts] no se pudo arrancar el planificador:', err)
  );
}
