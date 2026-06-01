/**
 * Helpers de fechas ISO (YYYY-MM-DD) sin timezone shift.
 *
 * Warning histórico: `new Date("2026-12-26")` parsea como UTC midnight. En
 * zonas con offset negativo (Argentina UTC-3) el Date local queda un día
 * atrás. Si después llamás `setDate(getDate() + 1)` (que opera en local),
 * volvés a la fecha original — bug silencioso. Usar siempre estos helpers
 * para evitarlo.
 */

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function tomorrowISO(): string {
  return addDaysISO(todayISO(), 1);
}

/** YYYY-MM-DD → DD/MM/YYYY, sin pasar por Date para evitar TZ shift. */
export function formatDateISO(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function addDaysISO(iso: string, days: number): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
