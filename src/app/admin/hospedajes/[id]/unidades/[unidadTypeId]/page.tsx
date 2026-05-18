import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Users,
  Bed,
  Hash,
} from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminCanAccessHospedaje } from "@/features/admin/lib/scope";
import { getUnidadType } from "@/features/unidades/lib/queries";
import { getFotoUrl } from "@/lib/storage";
import {
  UNIDAD_AMENITIES,
  UNIDAD_AMENITY_GROUPS,
  type UnidadAmenityKey,
} from "@/config/amenities-unidad";

interface PageProps {
  params: Promise<{ id: string; unidadTypeId: string }>;
}

export default async function AdminUnidadTypeDetailPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { id, unidadTypeId } = await params;

  try {
    await assertAdminCanAccessHospedaje(admin, id);
  } catch {
    notFound();
  }

  const sb = createAdminClient();
  const { data: hospedaje } = await sb
    .from("hospedajes")
    .select("id, nombre")
    .eq("id", id)
    .maybeSingle<{ id: string; nombre: string }>();
  if (!hospedaje) notFound();

  const unidadType = await getUnidadType(unidadTypeId);
  if (!unidadType || unidadType.hospedaje_id !== id) notFound();

  // Filtrar amenities que existen en el catálogo actual (defensa contra data
  // zombie por cambios de catálogo). Igual que el form del responsable.
  const amenitiesValidas = (unidadType.amenities as string[]).filter(
    (k): k is UnidadAmenityKey => k in UNIDAD_AMENITIES
  );

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <Link
          href={`/admin/hospedajes/${id}/unidades`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl tracking-tight">
            {unidadType.nombre}
          </h1>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              unidadType.activo
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {unidadType.activo ? (
              <CheckCircle2 className="h-3 w-3" aria-hidden />
            ) : (
              <XCircle className="h-3 w-3" aria-hidden />
            )}
            {unidadType.activo ? "Activo" : "Inactivo"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {hospedaje.nombre} — vista de solo lectura
        </p>
      </header>

      {/* Identidad */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Identidad</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Nombre</dt>
            <dd className="mt-0.5">{unidadType.nombre}</dd>
          </div>
          {unidadType.descripcion && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Descripción comercial
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap">
                {unidadType.descripcion}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Capacidad */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Capacidad y camas</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <dt className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden /> Adultos
            </dt>
            <dd className="mt-0.5">{unidadType.capacidad_adultos}</dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden /> Niños adicionales
            </dt>
            <dd className="mt-0.5">{unidadType.capacidad_ninos}</dd>
          </div>
          {unidadType.camas_descripcion && (
            <div className="sm:col-span-3">
              <dt className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Bed className="h-3.5 w-3.5" aria-hidden /> Camas
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap">
                {unidadType.camas_descripcion}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Amenities */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Amenities</h2>
        {amenitiesValidas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            El responsable todavía no marcó amenities.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {UNIDAD_AMENITY_GROUPS.map((group) => {
              const items = amenitiesValidas
                .map((k) => UNIDAD_AMENITIES[k])
                .filter((a) => a.group === group.key);
              if (items.length === 0) return null;
              return (
                <div key={group.key}>
                  <p className="text-xs font-medium text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {items.map((a) => {
                      const Icon = a.icon;
                      return (
                        <span
                          key={a.key}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs"
                        >
                          <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                          {a.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Fotos */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Fotos</h2>
        {unidadType.fotos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            El responsable todavía no subió fotos de este tipo.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {unidadType.fotos.map((f) => (
              <figure
                key={f.id}
                className="relative aspect-[4/3] overflow-hidden rounded-md border border-border"
              >
                <Image
                  src={getFotoUrl(f.storage_path)}
                  alt={f.alt ?? unidadType.nombre}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                />
                {f.es_principal && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Principal
                  </span>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* Unidades físicas */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">
          Unidades físicas
        </h2>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Hash className="h-3 w-3" aria-hidden />
          {unidadType.unidades.length === 0
            ? "Sin unidades físicas cargadas"
            : `${unidadType.unidades.length} ${
                unidadType.unidades.length === 1 ? "unidad" : "unidades"
              } registradas`}
        </p>
        {unidadType.unidades.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {unidadType.unidades.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="font-medium">{u.nombre}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                    u.activa
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {u.activa ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                  ) : (
                    <XCircle className="h-3 w-3" aria-hidden />
                  )}
                  {u.activa ? "Activa" : "Inactiva"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
