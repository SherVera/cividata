/** Forma canónica en BD: minúsculas, sin espacios extra. */
export function normalizeSpecialty(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

/** Presentación en UI: primera letra en mayúscula. */
export function formatSpecialty(value: string): string {
  const normalized = normalizeSpecialty(value);
  if (!normalized) return '';
  return normalized.charAt(0).toLocaleUpperCase('es') + normalized.slice(1);
}

export function profileSpecialtyForSave(value: string): string {
  const normalized = normalizeSpecialty(value);
  return normalized;
}

export function profileSpecialtyForDisplay(value: string | undefined | null): string {
  if (!value?.trim()) return '';
  return formatSpecialty(value);
}
