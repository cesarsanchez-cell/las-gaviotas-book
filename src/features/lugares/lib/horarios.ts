import type { HorariosLugar } from "@/types/database";

export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export const DIAS_ORDEN: DiaSemana[] = [
  "lun",
  "mar",
  "mie",
  "jue",
  "vie",
  "sab",
  "dom",
];

export const DIAS_LABEL: Record<DiaSemana, string> = {
  lun: "Lunes",
  mar: "Martes",
  mie: "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  sab: "Sábado",
  dom: "Domingo",
};

export const DIAS_LABEL_CORTO: Record<DiaSemana, string> = {
  lun: "Lun",
  mar: "Mar",
  mie: "Mié",
  jue: "Jue",
  vie: "Vie",
  sab: "Sáb",
  dom: "Dom",
};

const JS_DAY_TO_KEY: Record<number, DiaSemana> = {
  0: "dom",
  1: "lun",
  2: "mar",
  3: "mie",
  4: "jue",
  5: "vie",
  6: "sab",
};

export function diaActual(date: Date = new Date()): DiaSemana {
  return JS_DAY_TO_KEY[date.getDay()];
}

/**
 * Devuelve el horario del día actual (string libre tipo "12:00-15:00, 20:00-00:00")
 * o null si está cerrado o no se cargó.
 */
export function horarioHoy(
  horarios: HorariosLugar | null,
  date: Date = new Date()
): string | null {
  if (!horarios) return null;
  const key = diaActual(date);
  const v = horarios[key];
  return v && v.trim().length > 0 ? v : null;
}

/**
 * Devuelve los días agrupados con sus horarios formateados. Útil para el
 * detalle: lista todos los días con su rango o "Cerrado".
 */
export function horariosFormateados(
  horarios: HorariosLugar | null
): { dia: DiaSemana; label: string; valor: string }[] {
  return DIAS_ORDEN.map((dia) => {
    const v = horarios?.[dia];
    return {
      dia,
      label: DIAS_LABEL[dia],
      valor: v && v.trim().length > 0 ? v : "Cerrado",
    };
  });
}

/**
 * Best-effort: parsea un rango tipo "HH:MM-HH:MM" y determina si la hora
 * actual cae dentro. Soporta múltiples rangos separados por coma y rangos
 * que cruzan medianoche ("20:00-02:00"). Si no se puede parsear devuelve
 * `null` (mostrá el horario como info sin badge).
 */
export function estaAbiertoAhora(
  horarios: HorariosLugar | null,
  date: Date = new Date()
): boolean | null {
  if (!horarios) return null;
  const hoy = horarioHoy(horarios, date);
  if (!hoy) return false;

  const minutosAhora = date.getHours() * 60 + date.getMinutes();
  const rangos = hoy.split(",").map((r) => r.trim()).filter(Boolean);
  if (rangos.length === 0) return null;

  for (const rango of rangos) {
    const m = rango.match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const desde = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    let hasta = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
    if (hasta === 0) hasta = 24 * 60; // "00:00" como cierre = medianoche
    if (hasta >= desde) {
      if (minutosAhora >= desde && minutosAhora < hasta) return true;
    } else {
      // Cruza medianoche: ej. 20:00-02:00 → abierto si >= 20:00 o < 02:00
      if (minutosAhora >= desde || minutosAhora < hasta) return true;
    }
  }
  return false;
}
