"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import {
  UNIDAD_AMENITIES,
  UNIDAD_AMENITY_GROUPS,
  type UnidadAmenityKey,
} from "@/config/amenities-unidad";
import type { UnidadTypeRow } from "@/types/database";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

interface Props {
  /** Para edición: trae los datos actuales. Para alta: undefined. */
  initial?: UnidadTypeRow;
  /** Sin uso en alta — en alta se toma del input hidden. */
  hospedajeId: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<ActionResult>;
}

// Orden de los campos para el focus al primer error.
const FIELD_ORDER = [
  "nombre",
  "capacidad_adultos",
  "capacidad_ninos",
  "camas_descripcion",
  "descripcion",
  "orden",
  "primera_unidad_nombre",
] as const;

export function UnidadTypeForm({ initial, hospedajeId, submitLabel, action }: Props) {
  const isCreating = !initial;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [crearUnidad, setCrearUnidad] = useState<boolean>(false);
  const [nombreTipo, setNombreTipo] = useState<string>(initial?.nombre ?? "");
  const [primeraUnidadNombre, setPrimeraUnidadNombre] = useState<string>("");
  const [primeraUnidadDirty, setPrimeraUnidadDirty] = useState<boolean>(false);
  const [amenities, setAmenities] = useState<Set<UnidadAmenityKey>>(() => {
    // Filtrar keys que ya no existen en el catálogo actual (ej: tipos
    // creados con el catálogo viejo antes del 2026-05-18). Las inválidas se
    // descartan en silencio — el responsable las re-tilda si quiere.
    const raw = (initial?.amenities ?? []) as string[];
    const valid = raw.filter(
      (k): k is UnidadAmenityKey => k in UNIDAD_AMENITIES
    );
    return new Set(valid);
  });

  // Refs para focus en primer campo con error.
  const refs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>(
    {}
  );

  useEffect(() => {
    if (!Object.keys(fieldErrors).length) return;
    const firstWithError = FIELD_ORDER.find((k) => fieldErrors[k]);
    if (firstWithError) refs.current[firstWithError]?.focus();
  }, [fieldErrors]);

  function toggleAmenity(k: UnidadAmenityKey) {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const formData = new FormData(e.currentTarget);
    // Asegurar amenities (FormData.entries solo trae los checked, el resto no).
    formData.delete("amenities");
    for (const a of amenities) formData.append("amenities", a);
    startTransition(async () => {
      const res = await action(formData);
      if (res?.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
      // Si hubo ok+redirect, el server action ya hizo redirect.
    });
  }

  const fe = (k: string) => fieldErrors[k];
  const inputBase =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
  const cls = (k: string) =>
    `${inputBase}${fieldErrors[k] ? " border-rose-400 focus:ring-rose-300" : ""}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <input type="hidden" name="hospedaje_id" value={hospedajeId} />

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Identidad</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El nombre se muestra al huésped en la sección de unidades del hospedaje.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="nombre">
              Nombre del tipo <span className="text-rose-600">*</span>
            </label>
            <input
              ref={(el) => {
                refs.current.nombre = el;
              }}
              id="nombre"
              name="nombre"
              type="text"
              required
              value={nombreTipo}
              onChange={(e) => {
                const v = e.target.value;
                setNombreTipo(v);
                // Si no tocó el campo de primera unidad todavía, ir sugiriendo
                // el mismo nombre. Útil para caso "una casa, una unidad".
                if (!primeraUnidadDirty) setPrimeraUnidadNombre(v);
              }}
              placeholder="Dúplex 6 pax · Cabaña Norte · Apart 2 amb"
              maxLength={80}
              className={cls("nombre")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ejemplos: &quot;Dúplex 6 pax&quot;, &quot;Cabaña Norte&quot;, &quot;Apart 2 amb&quot;. Si tenés
              varias iguales, lo distinguís después con el nombre de cada unidad.
            </p>
            {fe("nombre") && (
              <p className="mt-1 text-xs text-rose-600">{fe("nombre")}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="orden">
              Orden
            </label>
            <input
              id="orden"
              name="orden"
              type="number"
              min={0}
              max={10000}
              defaultValue={initial?.orden ?? 0}
              className={cls("orden")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Menor = aparece primero en la página pública.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium" htmlFor="descripcion">
            Descripción comercial
          </label>
          <textarea
            ref={(el) => {
              refs.current.descripcion = el;
            }}
            id="descripcion"
            name="descripcion"
            rows={4}
            defaultValue={initial?.descripcion ?? ""}
            maxLength={2000}
            placeholder="Detalle el diferencial: vista al mar, balcón, planta alta, decoración, etc."
            className={cls("descripcion")}
          />
          {fe("descripcion") && (
            <p className="mt-1 text-xs text-rose-600">{fe("descripcion")}</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Capacidad</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cantidad <strong>máxima</strong> de personas que entra en esta unidad. Si
          tu unidad de 6 se ocupa con 4, eso queda para negociar en cada
          consulta — el sistema solo muestra la capacidad máxima al huésped.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="capacidad_adultos">
              Adultos <span className="text-rose-600">*</span>
            </label>
            <input
              ref={(el) => {
                refs.current.capacidad_adultos = el;
              }}
              id="capacidad_adultos"
              name="capacidad_adultos"
              type="number"
              min={1}
              max={30}
              required
              defaultValue={initial?.capacidad_adultos ?? ""}
              placeholder="6"
              className={cls("capacidad_adultos")}
            />
            {fe("capacidad_adultos") && (
              <p className="mt-1 text-xs text-rose-600">{fe("capacidad_adultos")}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="capacidad_ninos">
              Niños adicionales
            </label>
            <input
              ref={(el) => {
                refs.current.capacidad_ninos = el;
              }}
              id="capacidad_ninos"
              name="capacidad_ninos"
              type="number"
              min={0}
              max={30}
              defaultValue={initial?.capacidad_ninos ?? 0}
              placeholder="0"
              className={cls("capacidad_ninos")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Niños que entran <strong>además</strong> de los adultos (ej: catre,
              cucheta extra). Dejá 0 si no aplica distinción.
            </p>
            {fe("capacidad_ninos") && (
              <p className="mt-1 text-xs text-rose-600">{fe("capacidad_ninos")}</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Camas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Texto libre. Lo ve el huésped en la página pública.
        </p>
        <textarea
          ref={(el) => {
            refs.current.camas_descripcion = el;
          }}
          name="camas_descripcion"
          rows={3}
          defaultValue={initial?.camas_descripcion ?? ""}
          maxLength={300}
          placeholder="1 cama queen · 2 individuales · 1 sofá cama · 1 cucheta para niños"
          className={`mt-3 ${cls("camas_descripcion")}`}
        />
        {fe("camas_descripcion") && (
          <p className="mt-1 text-xs text-rose-600">{fe("camas_descripcion")}</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Amenities</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Marcá <strong>solo lo que el huésped tiene dentro de esta unidad</strong>.
          Servicios compartidos del complejo (pileta común, recepción, etc.) van
          en la descripción del hospedaje, no acá.
        </p>
        <div className="mt-4 space-y-4">
          {UNIDAD_AMENITY_GROUPS.map((group) => {
            const items = Object.values(UNIDAD_AMENITIES).filter(
              (a) => a.group === group.key
            );
            if (items.length === 0) return null;
            return (
              <div key={group.key}>
                <p className="text-xs font-medium text-muted-foreground">
                  {group.label}
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((a) => {
                    const Icon = a.icon;
                    const checked = amenities.has(a.key);
                    return (
                      <label
                        key={a.key}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 transition hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAmenity(a.key)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Icon className="h-4 w-4 text-primary" aria-hidden />
                        <span className="text-sm">{a.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Estado</h2>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={initial?.activo ?? true}
            className="h-4 w-4 rounded border-input"
          />
          <span>
            Activo (visible al público y disponible para consultas)
          </span>
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Si desactivás un tipo, sus unidades físicas también dejan de
          aparecer al público. No se borra nada — podés reactivarlo cuando
          quieras.
        </p>
      </section>

      {isCreating && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg tracking-tight">Atajo: primera unidad</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Si tenés <strong>una sola unidad de este tipo</strong> (típico de
            cabañas o casas individuales), creala ahora en el mismo paso. Si
            tenés varias del mismo tipo (ej. 3 dúplex iguales), dejá esto sin
            marcar y cargalas en lote desde la próxima pantalla.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="crear_unidad"
              checked={crearUnidad}
              onChange={(e) => setCrearUnidad(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span>Crear también la primera unidad ahora</span>
          </label>
          {crearUnidad && (
            <div className="mt-3">
              <label
                className="text-sm font-medium"
                htmlFor="primera_unidad_nombre"
              >
                Nombre de la unidad <span className="text-rose-600">*</span>
              </label>
              <input
                ref={(el) => {
                  refs.current.primera_unidad_nombre = el;
                }}
                id="primera_unidad_nombre"
                name="primera_unidad_nombre"
                type="text"
                required={crearUnidad}
                value={primeraUnidadNombre}
                onChange={(e) => {
                  setPrimeraUnidadNombre(e.target.value);
                  setPrimeraUnidadDirty(true);
                }}
                maxLength={60}
                placeholder={nombreTipo || "Dúplex 1"}
                className={cls("primera_unidad_nombre")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Se sugiere igual al nombre del tipo. Cambialo si querés (ej:
                &quot;Cabaña Norte&quot;, &quot;Dúplex 1&quot;).
              </p>
              {fe("primera_unidad_nombre") && (
                <p className="mt-1 text-xs text-rose-600">
                  {fe("primera_unidad_nombre")}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
