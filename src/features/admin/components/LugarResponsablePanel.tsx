"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, UserMinus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  assignResponsableToLugarAction,
  removeResponsableFromLugarAction,
} from "@/features/lugares/lib/actions";
import type { ResponsableOpt } from "@/features/admin/lib/lugar-queries";

interface Props {
  lugarId: string;
  responsablesActuales: ResponsableOpt[];
  candidatos: ResponsableOpt[];
}

export function LugarResponsablePanel({
  lugarId,
  responsablesActuales,
  candidatos,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [seleccionado, setSeleccionado] = React.useState<string>("");

  // Filtramos del selector a los que ya están asignados.
  const idsAsignados = new Set(responsablesActuales.map((r) => r.id));
  const disponibles = candidatos.filter((c) => !idsAsignados.has(c.id));

  function asignar() {
    if (!seleccionado) return;
    setError(null);
    startTransition(async () => {
      const r = await assignResponsableToLugarAction({
        lugarId,
        perfilId: seleccionado,
      });
      if (r?.error) setError(r.error);
      else {
        setSeleccionado("");
        router.refresh();
      }
    });
  }

  function quitar(perfilId: string) {
    if (
      !confirm("¿Sacar la responsabilidad? El dueño deja de poder editar este local.")
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await removeResponsableFromLugarAction({
        lugarId,
        perfilId,
      });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="mb-4">
        <h2 className="font-display text-lg tracking-tight">Responsable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {responsablesActuales.length === 0
            ? "Todavía nadie tiene control sobre este local. Asigná un responsable cuando el dueño tenga cuenta."
            : "El dueño puede editar horarios, fotos y datos desde su panel. Los cambios pasan por validación tuya."}
        </p>
      </header>

      {responsablesActuales.length > 0 && (
        <ul className="mb-4 space-y-2">
          {responsablesActuales.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.nombre}</p>
                <p className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" aria-hidden />
                  {r.email}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => quitar(r.id)}
                disabled={pending}
              >
                <UserMinus className="h-4 w-4" />
                Sacar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {disponibles.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[260px] flex-1">
            <Select
              value={seleccionado}
              onChange={(e) => setSeleccionado(e.target.value)}
              disabled={pending}
            >
              <option value="">Elegir responsable…</option>
              {disponibles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} — {r.email}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            onClick={asignar}
            disabled={!seleccionado || pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Asignar
          </Button>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          No hay responsables disponibles para asignar. Creá uno desde{" "}
          <Link href="/admin/responsables" className="underline">
            /admin/responsables
          </Link>
          .
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      )}
    </section>
  );
}
