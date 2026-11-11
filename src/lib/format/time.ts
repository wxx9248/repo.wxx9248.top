// Turns the ISO "T" separator into a space and drops seconds onward
const MINUTE_PRECISION = /T(\d{2}:\d{2}).*$/u;

export function formatTime(mtimeMs: number): { iso: string; text: string } {
  const iso = new Date(mtimeMs).toISOString();
  return { iso, text: iso.replace(MINUTE_PRECISION, " $1") };
}
