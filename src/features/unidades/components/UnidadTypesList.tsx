import Link from "next/link";
import Image from "next/image";
import { Plus, Bed, Users, Hash } from "lucide-react";
import { getFotoUrl } from "@/lib/storage";
import type { UnidadTypeConDetalle } from "@/features/unidades/lib/queries";

interface Props {
  unidadTypes: UnidadTypeConDetalle[];
  baseHref: string;
  /** Si readOnly = true, oculta el botón "Nuevo tipo" y los links de edición. */
  readOnly?: boolean;
}

export function UnidadTypesList({
  unidadTypes,
  baseHref,
  readOnly = false,
}: Props) {
  if (unidadTypes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <Bed className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 font-display text-lg tracking-tight">
          Todavía no cargaste tus unidades
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Un hospedaje puede tener varios <strong>tipos</strong> de unidad
          (cabaña, dúplex, apart) y de cada tipo, varias <strong>unidades
          físicas</strong> (Dúplex 1, Dúplex 2, etc). Empezá creando un tipo.
        </p>
        {!readOnly && (
          <Link
            href={`${baseHref}/nuevo`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Crear primer tipo
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <Link
            href={`${baseHref}/nuevo`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nuevo tipo de unidad
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {unidadTypes.map((ut) => {
          const activas = ut.unidades.filter((u) => u.activa).length;
          const total = ut.unidades.length;
          const href = `${baseHref}/${ut.id}`;
          return (
            <article
              key={ut.id}
              className={`overflow-hidden rounded-xl border bg-card transition ${
                ut.activo
                  ? "border-border hover:border-primary/50"
                  : "border-border/50 opacity-70"
              }`}
            >
              <div className="relative aspect-[16/10] bg-muted">
                {ut.foto_principal ? (
                  <Image
                    src={getFotoUrl(ut.foto_principal.storage_path)}
                    alt={ut.foto_principal.alt ?? ut.nombre}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sin foto principal todavía
                  </div>
                )}
                {!ut.activo && (
                  <span className="absolute right-2 top-2 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
                    Inactivo
                  </span>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-display text-base tracking-tight">
                  {ut.nombre}
                </h3>
                {ut.descripcion && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {ut.descripcion}
                  </p>
                )}

                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    <dt className="sr-only">Capacidad</dt>
                    <dd>
                      {ut.capacidad_adultos} adultos
                      {ut.capacidad_ninos > 0 && (
                        <> + {ut.capacidad_ninos} niños</>
                      )}
                    </dd>
                  </div>
                  {ut.camas_descripcion && (
                    <div className="inline-flex items-center gap-1">
                      <Bed className="h-3.5 w-3.5" aria-hidden />
                      <dd>{ut.camas_descripcion}</dd>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" aria-hidden />
                    <dd>
                      {total === 0 ? (
                        <span className="text-rose-600">Sin unidades físicas</span>
                      ) : (
                        <>
                          {activas} de {total} {total === 1 ? "unidad" : "unidades"}{" "}
                          {total === 1 ? "activa" : "activas"}
                        </>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {readOnly ? "Ver detalle" : "Editar tipo y unidades"} →
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
