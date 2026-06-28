/** Nombre público de la app (repositorio npm: kids-alive). */
export const APP_NAME = 'Cividata';

export const APP_TAGLINE = 'Historia clínica y registro de pacientes';

export const APP_DESCRIPTION =
  'Cividata: historia clínica y censo de pacientes, optimizado para uso en teléfonos.';

export const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || '';

/** Actívalo con VITE_ENABLE_CONTACT_EMAIL=true y SMTP en el servidor (opcional). */
export const CONTACT_EMAIL_FORM_ENABLED =
  import.meta.env.VITE_ENABLE_CONTACT_EMAIL === 'true' && Boolean(CONTACT_EMAIL);

/** Formato E.164 o legible; vacío oculta WhatsApp en la landing. */
export const CONTACT_PHONE: string = '+58 412-2027769';

const contactPhoneDigits = () => CONTACT_PHONE.replace(/\D/g, '');

/** Enlace wa.me; con texto opcional prellenado para el formulario de contacto. */
export function contactWhatsAppUrl(text?: string): string {
  const digits = contactPhoneDigits();
  if (!digits) return '';
  const base = `https://wa.me/${digits}`;
  const clean = text?.trim();
  return clean ? `${base}?text=${encodeURIComponent(clean)}` : base;
}
