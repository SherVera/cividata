export function parseRegistroDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

export function isRegistroToday(dateStr: string): boolean {
  const d = parseRegistroDate(dateStr);
  if (!d) return false;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function isRegistroWithinDays(dateStr: string, days: number): boolean {
  const d = parseRegistroDate(dateStr);
  if (!d) return false;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}
