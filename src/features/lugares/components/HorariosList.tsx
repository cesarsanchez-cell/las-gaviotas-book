import { Clock } from "lucide-react";
import {
  horariosFormateados,
  estaAbiertoAhora,
  diaActual,
  horarioHoy,
} from "@/features/lugares/lib/horarios";
import type { HorariosLugar } from "@/types/database";

interface HorariosListProps {
  horarios: HorariosLugar | null;
}

export function HorariosList({ horarios }: HorariosListProps) {
  if (!horarios) return null;
  const hoy = diaActual();
  const items = horariosFormateados(horarios);
  const abierto = estaAbiertoAhora(horarios);
  const hoyValor = horarioHoy(horarios);

  return (
    <div>
      {abierto !== null && (
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              abierto ? "bg-emerald-500" : "bg-rose-500"
            }`}
            aria-hidden
          />
          <span className="text-sm font-medium">
            {abierto ? "Abierto ahora" : "Cerrado ahora"}
          </span>
          {hoyValor && (
            <span className="text-sm text-muted-foreground">· {hoyValor}</span>
          )}
        </div>
      )}

      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((item) => {
          const esHoy = item.dia === hoy;
          return (
            <li
              key={item.dia}
              className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                esHoy ? "bg-muted/40 font-medium" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden
                />
                {item.label}
                {esHoy && (
                  <span className="text-xs text-muted-foreground">(hoy)</span>
                )}
              </span>
              <span
                className={
                  item.valor === "Cerrado"
                    ? "text-muted-foreground"
                    : "text-foreground"
                }
              >
                {item.valor}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
