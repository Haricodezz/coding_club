export function toLocalDatetimeLocal(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalDatetimeLocal(localStr: string): string {
  if (!localStr) return '';
  const d = new Date(localStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}
