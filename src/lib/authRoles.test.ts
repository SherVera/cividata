import { describe, expect, it } from 'vitest';
import {
  canManageClinicalData,
  defaultHomeTab,
  isRegistrador,
  resolveAppRole,
} from './authRoles';

describe('resolveAppRole', () => {
  it('resolves registrador as its own role', () => {
    expect(resolveAppRole({ app_metadata: { role: 'registrador' } } as any)).toBe('registrador');
  });

  it('defaults unknown roles to personal_medico', () => {
    expect(resolveAppRole({ app_metadata: {} } as any)).toBe('personal_medico');
  });
});

describe('registrador permissions', () => {
  it('is identified as registrador', () => {
    expect(isRegistrador('registrador')).toBe(true);
    expect(isRegistrador('personal_medico')).toBe(false);
  });

  it('cannot manage clinical data', () => {
    expect(canManageClinicalData('registrador')).toBe(false);
    expect(canManageClinicalData('personal_medico')).toBe(true);
  });

  it('opens on listado tab by default', () => {
    expect(defaultHomeTab('registrador')).toBe('listado');
    expect(defaultHomeTab('personal_medico')).toBe('estadisticas');
  });
});
