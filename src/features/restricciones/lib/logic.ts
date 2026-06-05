/**
 * Lógica pura de restricciones, sin acceso a BD. La comparten la búsqueda
 * (`searchUnidadesPorDestino`) y la ficha pública de unidad. Mantener acá
 * cualquier regla de evaluación para que ambas superficies coincidan.
 *
 * Semántica de día: ISO weekday, 1 = lunes … 7 = domingo (igual que la BD).
 */

/** Subconjunto de `RestriccionRow` que basta para evaluar y describir. */
export interface RestriccionMin {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  estadia_minima_noches: number | null;
  dia_ingreso: number | null;
  dia_egreso: number | null;
}

/** Singular y plural por ISO weekday. */
const DIA_SINGULAR: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
};
const DIA_PLURAL: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábados",
  7: "domingos",
};

/** ISO weekday (1=lunes … 7=domingo) de una fecha YYYY-MM-DD, sin drift de TZ. */
export function isoWeekday(iso: string): number {
  const day = new Date(iso + "T00:00:00Z").getUTCDay(); // 0=domingo … 6=sábado
  return day === 0 ? 7 : day;
}

/** Noches entre check-in (inclusive) y check-out (exclusive). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T00:00:00Z").getTime();
  const b = new Date(checkOut + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Una restricción aplica a una estadía si la **fecha de llegada** cae dentro
 * de su rango [desde, hasta]. La llegada gobierna (criterio de temporada).
 */
export function restriccionAplica(r: RestriccionMin, checkIn: string): boolean {
  return r.desde <= checkIn && checkIn <= r.hasta;
}

/**
 * Evalúa todas las restricciones que aplican a la estadía. Si alguna se viola,
 * devuelve `{ ok: false }` con los motivos legibles. Reglas combinadas con AND.
 */
export function evaluarRestricciones(
  restricciones: RestriccionMin[],
  checkIn: string,
  checkOut: string
): { ok: boolean; motivos: string[] } {
  const motivos: string[] = [];
  const noches = nightsBetween(checkIn, checkOut);
  const wdIn = isoWeekday(checkIn);
  const wdOut = isoWeekday(checkOut);

  for (const r of restricciones) {
    if (!restriccionAplica(r, checkIn)) continue;

    if (r.estadia_minima_noches != null && noches < r.estadia_minima_noches) {
      motivos.push(
        `Estadía mínima de ${r.estadia_minima_noches} ${
          r.estadia_minima_noches === 1 ? "noche" : "noches"
        } para esas fechas`
      );
    }
    if (r.dia_ingreso != null && wdIn !== r.dia_ingreso) {
      motivos.push(`El ingreso debe ser ${DIA_SINGULAR[r.dia_ingreso]}`);
    }
    if (r.dia_egreso != null && wdOut !== r.dia_egreso) {
      motivos.push(`El egreso debe ser ${DIA_SINGULAR[r.dia_egreso]}`);
    }
  }

  return { ok: motivos.length === 0, motivos };
}

/**
 * Describe una restricción como chips legibles para la ficha pública.
 * Ej: ["Estadía mínima 3 noches", "Ingreso solo sábados"].
 */
export function describirRestriccion(r: RestriccionMin): string[] {
  const out: string[] = [];
  if (r.estadia_minima_noches != null) {
    out.push(
      `Estadía mínima ${r.estadia_minima_noches} ${
        r.estadia_minima_noches === 1 ? "noche" : "noches"
      }`
    );
  }
  if (r.dia_ingreso != null) {
    out.push(`Ingreso solo ${DIA_PLURAL[r.dia_ingreso]}`);
  }
  if (r.dia_egreso != null) {
    out.push(`Egreso solo ${DIA_PLURAL[r.dia_egreso]}`);
  }
  return out;
}
