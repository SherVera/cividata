import { describe, expect, it } from 'vitest';
import {
  canViewPatientGeolocation,
  canViewPatientAuditGeolocation,
  canViewPatientRegistrantAudit,
  canViewClinicalRecord,
  canViewClinicalResidence,
  canViewSensitivePatientPii,
} from './patientPrivacy';

describe('patientPrivacy', () => {
  it('oculta geolocalización en ficha general', () => {
    expect(canViewPatientGeolocation()).toBe(false);
  });

  it('muestra auditoría solo a admin', () => {
    expect(canViewPatientRegistrantAudit('registrador')).toBe(false);
    expect(canViewPatientRegistrantAudit('personal_medico')).toBe(false);
    expect(canViewPatientRegistrantAudit('admin')).toBe(true);
    expect(canViewPatientRegistrantAudit('super_admin')).toBe(true);
    expect(canViewPatientAuditGeolocation('admin')).toBe(true);
    expect(canViewPatientAuditGeolocation('personal_medico')).toBe(false);
  });

  it('restringe PII sensible al personal clínico', () => {
    expect(canViewSensitivePatientPii('registrador')).toBe(false);
    expect(canViewSensitivePatientPii('personal_medico')).toBe(true);
    expect(canViewClinicalResidence('personal_medico')).toBe(true);
    expect(canViewClinicalResidence('registrador')).toBe(false);
    expect(canViewClinicalRecord('personal_medico')).toBe(true);
    expect(canViewClinicalRecord('registrador')).toBe(false);
    expect(canViewSensitivePatientPii('admin')).toBe(true);
  });
});
