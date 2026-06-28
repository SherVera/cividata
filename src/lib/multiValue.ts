/** Convierte texto separado por comas en lista única (sin vacíos). */
export function parseMultiValue(value: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of (value || '').split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(trimmed);
  }
  return items;
}

/** Une ítems en texto separado por comas. */
export function joinMultiValue(items: string[]): string {
  return items.join(', ');
}
