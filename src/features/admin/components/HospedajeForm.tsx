"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AMENITIES, AMENITY_KEYS, type AmenityKey } from "@/config/amenities";
import { TIPO_HOSPEDAJE_LABEL } from "@/features/hospedajes/types";
import { TIPOS_VALIDOS } from "@/features/busqueda/lib/filters";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import type {
  HospedajeRow,
  EstadoHospedaje,
} from "@/types/database";

const ESTADOS: { value: EstadoHospedaje; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "pendiente_validacion", label: "Pendiente de validación" },
  { value: "publicado", label: "Publicado" },
  { value: "pausado", label: "Pausado" },
  { value: "rechazado", label: "Rechazado" },
];

interface DestinoOpt {
  id: string;
  slug: string;
  nombre: string;
}

interface LocalidadOpt {
  id: string;
  slug: string;
  nombre: string;
  destino_id?: string;
}

interface HospedajeFormProps {
  destinos: DestinoOpt[];
  localidadesPorDestino: Record<string, LocalidadOpt[]>;
  initial?: Partial<HospedajeRow>;
  submitLabel: string;
  action: (formData: FormData) => Promise<ActionResult | void>;
  /**
   * "admin" muestra todos los campos. "responsable" oculta los exclusivos del admin
   * (estado, destacado, orden_listado, responsable_validado).
   */
  mode?: "admin" | "responsable";
}

export function HospedajeForm({
  destinos,
  localidadesPorDestino,
  initial,
  submitLabel,
  action,
  mode = "admin",
}: HospedajeFormProps) {
  const isAdmin = mode === "admin";
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<ActionResult | null>(null);

  const [destinoId, setDestinoId] = React.useState(
    initial?.destino_id ?? destinos[0]?.id ?? ""
  );
  const [nombre, setNombre] = React.useState(initial?.nombre ?? "");
  const [slug, setSlug] = React.useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial?.slug));
  const [amenities, setAmenities] = React.useState<Set<string>>(
    new Set(initial?.amenities ?? [])
  );

  // Slug auto-generado al tipear el nombre, salvo que el user ya lo tocó
  React.useEffect(() => {
    if (!slugTouched && nombre) setSlug(slugify(nombre));
  }, [nombre, slugTouched]);

  const localidades = localidadesPorDestino[destinoId] ?? [];

  function fieldError(name: string): string | undefined {
    return result?.fieldErrors?.[name];
  }

  function toggleAmenity(key: AmenityKey) {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // preventDefault evita el reset automático de React 19 al usar <form action>.
    // Así los inputs preservan sus valores cuando hay error de validación.
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Inyectar amenities seleccionadas (estado controlado en React)
    formData.delete("amenities");
    amenities.forEach((a) => formData.append("amenities", a));

    startTransition(async () => {
      const res = await action(formData);
      if (res) {
        setResult(res);
        if (res.ok) {
          router.refresh();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (res.error) {
          setTimeout(() => {
            const firstError = document.querySelector(
              "[data-form-error]"
            ) as HTMLElement | null;
            (firstError ?? document.querySelector("form"))?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 50);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Sección: Información básica */}
      <FormSection
        title="Información básica"
        description="Datos generales que aparecen en el listado y header del detalle."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre" required error={fieldError("nombre")}>
            <Input
              name="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Posta Cangrejo Apart"
              required
            />
          </Field>

          <Field
            label="Slug (URL)"
            required
            error={fieldError("slug")}
            hint="Se genera automáticamente del nombre. Editalo si querés."
          >
            <Input
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugTouched(true);
              }}
              placeholder="posta-cangrejo-apart"
              required
            />
          </Field>

          <Field label="Tipo" required error={fieldError("tipo")}>
            <Select name="tipo" defaultValue={initial?.tipo ?? "apart"} required>
              {TIPOS_VALIDOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_HOSPEDAJE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Destino" required error={fieldError("destino_id")}>
            <Select
              name="destino_id"
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              required
            >
              {destinos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Localidad (zona)" error={fieldError("localidad_id")}>
            <Select
              name="localidad_id"
              defaultValue={initial?.localidad_id ?? ""}
            >
              <option value="">— Sin asignar —</option>
              {localidades.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </Select>
          </Field>

          {isAdmin && (
            <Field label="Estado" error={fieldError("estado")}>
              <Select name="estado" defaultValue={initial?.estado ?? "borrador"}>
                {ESTADOS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </FormSection>

      {/* Sección: Descripción */}
      <FormSection title="Descripción" description="Texto público del hospedaje.">
        <Field
          label="Descripción corta"
          required
          error={fieldError("descripcion_corta")}
          hint="20-200 caracteres. Aparece en el card del listado."
        >
          <Textarea
            name="descripcion_corta"
            defaultValue={initial?.descripcion_corta ?? ""}
            rows={2}
            maxLength={200}
            required
            placeholder="Aparts modernos a metros del mar, con parrilla y deck propio."
          />
        </Field>

        <Field
          label="Descripción larga"
          error={fieldError("descripcion_larga")}
          hint="Aparece en la página de detalle. Acepta saltos de línea."
        >
          <Textarea
            name="descripcion_larga"
            defaultValue={initial?.descripcion_larga ?? ""}
            rows={6}
            maxLength={5000}
            placeholder="Departamentos completamente equipados..."
          />
        </Field>
      </FormSection>

      {/* Sección: Capacidad */}
      <FormSection title="Capacidad">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Mínimo" error={fieldError("capacidad_min")}>
            <Input
              type="number"
              name="capacidad_min"
              defaultValue={initial?.capacidad_min ?? ""}
              min={1}
              max={50}
            />
          </Field>
          <Field label="Máximo" error={fieldError("capacidad_max")}>
            <Input
              type="number"
              name="capacidad_max"
              defaultValue={initial?.capacidad_max ?? ""}
              min={1}
              max={100}
            />
          </Field>
          <Field
            label="Cantidad de unidades"
            error={fieldError("cantidad_unidades")}
            hint="¿Cuántas unidades idénticas tiene?"
          >
            <Input
              type="number"
              name="cantidad_unidades"
              defaultValue={initial?.cantidad_unidades ?? 1}
              min={1}
              max={200}
            />
          </Field>
        </div>
      </FormSection>

      {/* Sección: Ubicación */}
      <FormSection title="Ubicación">
        <Field label="Dirección" required error={fieldError("direccion")}>
          <Input
            name="direccion"
            defaultValue={initial?.direccion ?? ""}
            required
            placeholder="Calle 33 entre Costanera y 1, Las Gaviotas"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Latitud" error={fieldError("lat")}>
            <Input
              name="lat"
              defaultValue={initial?.lat ?? ""}
              placeholder="-36.7820"
            />
          </Field>
          <Field label="Longitud" error={fieldError("lng")}>
            <Input
              name="lng"
              defaultValue={initial?.lng ?? ""}
              placeholder="-56.6485"
            />
          </Field>
          <Field label="URL Google Maps" error={fieldError("google_maps_url")}>
            <Input
              name="google_maps_url"
              defaultValue={initial?.google_maps_url ?? ""}
              type="url"
            />
          </Field>
        </div>
      </FormSection>

      {/* Sección: Contacto */}
      <FormSection title="Contacto del alojamiento">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="WhatsApp"
            required
            error={fieldError("whatsapp")}
            hint="Formato internacional: +5491155555555"
          >
            <Input
              name="whatsapp"
              defaultValue={initial?.whatsapp ?? ""}
              required
              placeholder="+5491155555555"
            />
          </Field>
          <Field label="Email" error={fieldError("email")}>
            <Input
              type="email"
              name="email"
              defaultValue={initial?.email ?? ""}
            />
          </Field>
          <Field label="Teléfono" error={fieldError("telefono")}>
            <Input
              name="telefono"
              defaultValue={initial?.telefono ?? ""}
            />
          </Field>
          <Field
            label="Instagram"
            error={fieldError("instagram")}
            hint="Solo el handle, sin @"
          >
            <Input
              name="instagram"
              defaultValue={initial?.instagram ?? ""}
              placeholder="postacangrejoapart"
            />
          </Field>
          <Field label="Website" error={fieldError("website")}>
            <Input
              type="url"
              name="website"
              defaultValue={initial?.website ?? ""}
              placeholder="https://..."
            />
          </Field>
        </div>
      </FormSection>

      {/* Sección: Amenities */}
      <FormSection
        title="Amenities"
        description="Servicios y comodidades. Aparecen como filtros en el listado."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {AMENITY_KEYS.map((key) => {
            const a = AMENITIES[key];
            const Icon = a.icon;
            const checked = amenities.has(key);
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 transition hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <Checkbox
                  checked={checked}
                  onChange={() => toggleAmenity(key)}
                />
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm">{a.label}</span>
              </label>
            );
          })}
        </div>
      </FormSection>

      {/* Sección: Responsable */}
      <FormSection
        title="Responsable"
        description="Persona a cargo del alojamiento. Estos datos NO se muestran al público."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Nombre completo"
            required
            error={fieldError("responsable_nombre")}
          >
            <Input
              name="responsable_nombre"
              defaultValue={initial?.responsable_nombre ?? ""}
              required
            />
          </Field>
          <Field
            label="Documento (DNI/CUIT)"
            error={fieldError("responsable_documento")}
          >
            <Input
              name="responsable_documento"
              defaultValue={initial?.responsable_documento ?? ""}
            />
          </Field>
          <Field label="Email del responsable" error={fieldError("responsable_email")}>
            <Input
              type="email"
              name="responsable_email"
              defaultValue={initial?.responsable_email ?? ""}
            />
          </Field>
          <Field
            label="WhatsApp del responsable"
            error={fieldError("responsable_whatsapp")}
          >
            <Input
              name="responsable_whatsapp"
              defaultValue={initial?.responsable_whatsapp ?? ""}
              placeholder="+5491155555555"
            />
          </Field>
        </div>
        {isAdmin && (
          <Field error={fieldError("responsable_validado")}>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                name="responsable_validado"
                defaultChecked={initial?.responsable_validado ?? false}
              />
              Responsable validado (checkeé identidad y datos)
            </label>
          </Field>
        )}
      </FormSection>

      {/* Sección: SEO */}
      <FormSection
        title="SEO (opcional)"
        description="Override de metadata para mejor posicionamiento."
      >
        <Field
          label="Meta title"
          error={fieldError("meta_title")}
          hint="Máx 70 caracteres. Si vacío, se usa el nombre."
        >
          <Input
            name="meta_title"
            defaultValue={initial?.meta_title ?? ""}
            maxLength={70}
          />
        </Field>
        <Field
          label="Meta description"
          error={fieldError("meta_description")}
          hint="Máx 180 caracteres. Si vacío, se usa la descripción corta."
        >
          <Textarea
            name="meta_description"
            defaultValue={initial?.meta_description ?? ""}
            rows={2}
            maxLength={180}
          />
        </Field>
      </FormSection>

      {/* Sección: Configuración — solo admin */}
      {isAdmin && (
        <FormSection title="Visibilidad">
          <div className="space-y-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                name="destacado"
                defaultChecked={initial?.destacado ?? false}
              />
              Marcar como destacado en la landing
            </label>
            <Field
              label="Orden en listado"
              error={fieldError("orden_listado")}
              hint="Mayor valor = aparece antes. Default 0."
            >
              <Input
                type="number"
                name="orden_listado"
                defaultValue={initial?.orden_listado ?? 0}
                min={0}
                max={10000}
              />
            </Field>
          </div>
        </FormSection>
      )}

      {/* Errores generales */}
      {result?.error && (
        <div
          data-form-error
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <p className="font-medium">{result.error}</p>
          {result.fieldErrors &&
            Object.keys(result.fieldErrors).length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs">
                {Object.entries(result.fieldErrors).map(([field, msg]) => (
                  <li key={field}>
                    <span className="font-medium">{field}:</span> {msg}
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
      {result?.ok && (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ Cambios guardados.
        </div>
      )}

      {/* Submit */}
      <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-3 border-t border-border bg-background px-6 py-4 md:-mx-10 md:px-10">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="mb-5">
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

interface FieldProps {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
