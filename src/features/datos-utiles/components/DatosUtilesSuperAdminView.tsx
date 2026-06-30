"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listRubros,
  listDatosUtilesByDestino,
  countItemsByRubro,
} from "@/features/datos-utiles/lib/queries";
import { DatosUtilesPanel } from "./DatosUtilesPanel";
import type { DestinoListRow } from "@/features/admin/lib/destino-management";

interface DatosUtilesSuperAdminViewProps {
  destinos: DestinoListRow[];
  selectedDestinoId: string | null;
}

export function DatosUtilesSuperAdminView({
  destinos,
  selectedDestinoId,
}: DatosUtilesSuperAdminViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDestinoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const destinoId = e.target.value;
    startTransition(() => {
      router.push(
        destinoId ? `/admin/datos-utiles?destino_id=${destinoId}` : "/admin/datos-utiles"
      );
    });
  };

  if (!selectedDestinoId) {
    return (
      <div className="max-w-4xl space-y-6">
        <header>
          <h1 className="font-display text-3xl tracking-tight">Datos Útiles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Información local para visitantes de cada destino
          </p>
        </header>

        <div className="rounded-lg border border-input bg-card p-6">
          <label htmlFor="destino-select" className="block text-sm font-medium">
            Selecciona un destino
          </label>
          <select
            id="destino-select"
            value=""
            onChange={handleDestinoChange}
            disabled={isPending}
            className="mt-2 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Elige un destino —</option>
            {destinos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  const destino = destinos.find((d) => d.id === selectedDestinoId);
  if (!destino) {
    return (
      <div className="max-w-4xl space-y-6">
        <header>
          <h1 className="font-display text-3xl tracking-tight">Datos Útiles</h1>
        </header>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Destino no encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Datos Útiles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {destino.nombre}
        </p>
      </header>

      <div className="rounded-lg border border-input bg-card p-4">
        <label htmlFor="destino-select" className="block text-sm font-medium">
          Cambiar destino
        </label>
        <select
          id="destino-select"
          value={selectedDestinoId}
          onChange={handleDestinoChange}
          disabled={isPending}
          className="mt-2 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {destinos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
      </div>

      <DatosUtilesSuperAdminContent destinoId={selectedDestinoId} />
    </div>
  );
}

async function DatosUtilesSuperAdminContent({ destinoId }: { destinoId: string }) {
  const [rubros, datosUtiles] = await Promise.all([
    listRubros(),
    listDatosUtilesByDestino(destinoId),
  ]);

  const itemCounts = await countItemsByRubro(destinoId);

  return (
    <DatosUtilesPanel
      destinoId={destinoId}
      rubros={rubros}
      datosUtiles={datosUtiles}
      itemCounts={itemCounts}
    />
  );
}
