export interface WhatsAppResult {
  ok: boolean;
  reason?: string;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Envía un mensaje de WhatsApp mediante la API Cloud de Meta.
 * Requiere WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_ID en el entorno.
 */
export async function sendWhatsApp(to: string, body: string): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    return { ok: false, reason: 'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_ID no configurados' };
  }

  const number = normalizePhone(to);
  if (!number) {
    return { ok: false, reason: 'Número de teléfono inválido' };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: number,
          type: 'text',
          text: { body, preview_url: false },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, reason: `HTTP ${res.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Error de red' };
  }
}
