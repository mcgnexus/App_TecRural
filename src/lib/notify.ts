import { listLeads, alreadyAlerted, markAlerted } from './db';
import { findMunicipality } from './municipalities';
import { findCrop } from './crops';
import { getWeather } from './weather';
import { computeAlarms, type Alarm } from './alarms';
import { currentPhenology } from './phenology';
import { sendWhatsApp } from './whatsapp';
import { businessName } from './wa';

export interface AlertCheckItem {
  phone: string;
  name: string;
  municipality: string;
  crop: string;
  status: 'sent' | 'already' | 'skipped' | 'error';
  detail: string;
}

export interface AlertCheckResult {
  dryRun: boolean;
  checked: number;
  sent: number;
  already: number;
  skipped: number;
  errors: number;
  items: AlertCheckItem[];
}

export interface AlertCheckOptions {
  /** Solo muestra lo que se enviaría, sin enviar ni registrar. */
  dryRun?: boolean;
}

const LEVEL_LABEL: Record<string, string> = {
  alert: 'ALERTA',
  warning: 'ATENCIÓN',
  info: 'AVISO',
};

function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function buildMessage(
  alarms: Alarm[],
  opts: { zona: string; cultivo: string; fase?: string }
): string {
  const lines = [
    `${businessName()} · Aviso meteorológico`,
    `Zona: ${opts.zona} · Cultivo: ${opts.cultivo}`,
  ];
  if (opts.fase) lines.push(`Fase del cultivo: ${opts.fase}`);
  lines.push('');
  for (const a of alarms) {
    lines.push(`• ${a.title.toUpperCase()} [${LEVEL_LABEL[a.level]}]`);
    lines.push(`  ${a.message}`);
    lines.push(`  Consejo: ${a.advice}`);
    lines.push('');
  }
  lines.push('Puedes consultar el detalle en tu zona en la web de ' + businessName() + '.');
  return lines.join('\n').trim();
}

/**
 * Revisa el tiempo de cada contacto registrado y envía por WhatsApp las
 * alarmas que aún no se hayan notificado hoy. En modo dryRun no envía nada.
 */
export async function runAlertChecks(
  opts: AlertCheckOptions = {}
): Promise<AlertCheckResult> {
  const dryRun = opts.dryRun !== false;
  const result: AlertCheckResult = {
    dryRun,
    checked: 0,
    sent: 0,
    already: 0,
    skipped: 0,
    errors: 0,
    items: [],
  };

  const leads = await listLeads().catch((err) => {
    console.error('[alerts] no se pudieron leer los contactos:', err);
    return [] as Awaited<ReturnType<typeof listLeads>>;
  });

  for (const lead of leads) {
    result.checked += 1;
    const place = findMunicipality(lead.municipality);
    const crop = findCrop(lead.crop);

    if (!place) {
      result.skipped += 1;
      result.items.push({
        phone: lead.phone,
        name: lead.name,
        municipality: lead.municipality,
        crop: lead.crop,
        status: 'skipped',
        detail: 'Municipio no reconocido',
      });
      continue;
    }

    try {
      const weather = await getWeather({
        name: place.name,
        lat: place.lat,
        lon: place.lon,
        aemet: place.aemet,
        province: place.province,
      });
      const alarms = computeAlarms(weather, { crop }).filter(
        (a) => a.level !== 'info'
      );

      if (alarms.length === 0) {
        result.skipped += 1;
        result.items.push({
          phone: lead.phone,
          name: lead.name,
          municipality: lead.municipality,
          crop: crop?.label ?? lead.crop,
          status: 'skipped',
          detail: 'Sin alarmas destacadas',
        });
        continue;
      }

      const day = todayLocal();
      const newAlarms: Alarm[] = [];
      for (const a of alarms) {
        const already = await alreadyAlerted(lead.phone, a.kind, day);
        if (!already) newAlarms.push(a);
      }

      if (newAlarms.length === 0) {
        result.already += 1;
        result.items.push({
          phone: lead.phone,
          name: lead.name,
          municipality: lead.municipality,
          crop: crop?.label ?? lead.crop,
          status: 'already',
          detail: 'Alarmas ya notificadas hoy',
        });
        continue;
      }

      const message = buildMessage(newAlarms, {
        zona: place.name,
        cultivo: crop?.label ?? lead.crop,
        fase: currentPhenology(lead.crop, place.zone).main.label,
      });

      if (dryRun) {
        result.sent += 1;
        result.items.push({
          phone: lead.phone,
          name: lead.name,
          municipality: lead.municipality,
          crop: crop?.label ?? lead.crop,
          status: 'sent',
          detail: `(dry-run) ${newAlarms
            .map((a) => a.title)
            .join(' · ')}`,
        });
        continue;
      }

      const sent = await sendWhatsApp(lead.phone, message);
      if (sent.ok) {
        for (const a of newAlarms) {
          await markAlerted(lead.phone, a.kind, day, a.title).catch(() => undefined);
        }
        result.sent += 1;
        result.items.push({
          phone: lead.phone,
          name: lead.name,
          municipality: lead.municipality,
          crop: crop?.label ?? lead.crop,
          status: 'sent',
          detail: newAlarms.map((a) => a.title).join(' · '),
        });
      } else {
        result.errors += 1;
        result.items.push({
          phone: lead.phone,
          name: lead.name,
          municipality: lead.municipality,
          crop: crop?.label ?? lead.crop,
          status: 'error',
          detail: sent.reason ?? 'Error al enviar',
        });
      }
    } catch (err) {
      result.errors += 1;
      result.items.push({
        phone: lead.phone,
        name: lead.name,
        municipality: lead.municipality,
        crop: crop?.label ?? lead.crop,
        status: 'error',
        detail: err instanceof Error ? err.message : 'Error inesperado',
      });
    }
  }

  return result;
}
