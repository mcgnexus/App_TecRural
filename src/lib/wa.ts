export function businessName(): string {
  return process.env.BUSINESS_NAME || 'TecRural';
}

export function whatsappNumber(): string {
  return process.env.WHATSAPP_NUMBER || '';
}

export function buildWhatsAppLink(message: string): string {
  const number = whatsappNumber().replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(message.trim());
  return `https://wa.me/${number}?text=${encoded}`;
}

export function defaultWhatsAppMessage(): string {
  return `Hola ${businessName()}, me gustaría información sobre vuestros servicios para mi finca.`;
}
