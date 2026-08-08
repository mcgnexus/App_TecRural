/**
 * Arranque del servidor (Node.js).
 *
 * Si ALERTS_ENABLED=true, pide a la ruta interna /api/alerts/schedule que
 * arranque el planificador de avisos (primera revisión + intervalo). No se
 * importa código de la aplicación aquí para no empaquetar módulos nativos
 * en el bundle de instrumentation.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.ALERTS_ENABLED !== 'true') return;

  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  fetch(`${base}/api/alerts/schedule`).catch((err) =>
    console.warn('[alerts] no se pudo arrancar el planificador:', err)
  );
}
