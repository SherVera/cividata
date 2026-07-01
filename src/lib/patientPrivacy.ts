import type { AppRole } from './authRoles';
import { canManageClinicalData, isAppAdmin } from './authRoles';

/** Coordenadas GPS en la ficha general (no auditoría): nadie. */
export function canViewPatientGeolocation(): boolean {
  return false;
}

/** Coordenadas GPS solo en bloque de auditoría (admin). */
export function canViewPatientAuditGeolocation(role: AppRole): boolean {
  return isAppAdmin(role);
}

/** Dirección escrita, punto de referencia y domicilio (contexto clínico, no GPS). */
export function canViewClinicalResidence(role: AppRole): boolean {
  return canManageClinicalData(role);
}

/** Antecedentes, educación, evolución y resto de la ficha clínica/censo completa. */
export function canViewClinicalRecord(role: AppRole): boolean {
  return canManageClinicalData(role);
}

/** Cédula, teléfonos, correo y documentos del representante. */
export function canViewSensitivePatientPii(role: AppRole): boolean {
  return canManageClinicalData(role);
}

/** Quién registró la captura y metadatos internos (admin / super admin). */
export function canViewPatientRegistrantAudit(role: AppRole): boolean {
  return isAppAdmin(role);
}
