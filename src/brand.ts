/** Nombre público de la app (repositorio npm: kids-alive). */
export const APP_NAME = 'Cividata';

export const APP_TAGLINE = 'Censo y seguimiento clínico de pacientes';

/** Versión visible en la app. */
export const APP_VERSION = '2.0';

export const APP_DESCRIPTION =
  'Cividata: captura en censo, triaje clínico y seguimiento, optimizado para uso en teléfonos.';

/** Alta inicial del paciente en brigada / centro (antes «triaje» en la UI). */
export const CAPTURE_LABEL = 'Captura';
export const CAPTURE_QUICK_LABEL = 'Captura rápida';
export const CAPTURE_FULL_LABEL = 'Captura completa';
export const CAPTURE_POINT_LABEL = 'Punto de captura';

/** Vista de ficha del paciente (asistentes / registradores, sin historial clínico). */
export const PATIENT_FILE_LABEL = 'Ficha';

/** Evaluación clínica de urgencia por visita (care_pathway). */
export const CLINICAL_TRIAGE_LABEL = 'Triaje clínico';

/** Punto físico de captura e insumos (centro de apoyo = mismo concepto). */
export const COLLECTION_CENTER_LABEL = 'Centro de acopio';
export const COLLECTION_CENTER_LABEL_PLURAL = 'Centros de acopio';

export type FacilityType = 'acopio' | 'hospital';

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  acopio: COLLECTION_CENTER_LABEL,
  hospital: 'Hospital',
};

/** @deprecated Use CAPTURE_LABEL */
export const TRIAGE_LABEL = CAPTURE_LABEL;
/** @deprecated Use APP_TAGLINE */
export const TRIAGE_MEDICAL_LABEL = 'Captura en censo';

export const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || '';

/** Activo si VITE_CONTACT_EMAIL está en el build; el envío usa SMTP en /api/contact (Vercel). */
export const CONTACT_EMAIL_FORM_ENABLED = Boolean(CONTACT_EMAIL);

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
