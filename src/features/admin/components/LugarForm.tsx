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
import {
  CATEGORIAS_GASTRONOMICO,
  CATEGORIAS_ATRACTIVO,
  CATEGORIAS_GASTRONOMICO_KEYS,
  CATEGORIAS_ATRACTIVO_KEYS,
} from "@/config/categorias-lugar";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/features/lugares/lib/actions";
import type { LugarRow, TipoLugar, HorariosLugar } from "@/types/database";

interface DestinoOpt {
  id: string;
  slug: string;
  nombre: string;
}

interface LugarFormProps {
  tipo: TipoLugar;
  destinos: DestinoOpt[];
  initial?: Partial<LugarRow>;
  submitLabel: string;
  action: (formData: FormData) => Promise<ActionResult | void>;
  /**
   * "admin" muestra todos los campos (curaduría: imperdible / destacado).
   * "responsable" oculta esos — son decisiones del admin local.
   */
  mode?: "admin" | "responsable";
}

const DIAS: { key: keyof HorariosLugar; label: string }[] = [
  { key: "lun", label: "Lunes" },
  { key: "mar", label: "Martes" },
  { key: "mie", label: "Miércoles" },
  { key: "jue", label: "Jueves" },
  { key: "vie", label: "Viernes" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

export function LugarForm({
  tipo,
  destinos,
  initial,
  submitLabel,
  action,
  mode = "admin",
}: LugarFormProps) {
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
  const [horarios, setHorarios] = React.useState<HorariosLugar>(
    initial?.horarios ?? {}
  );

  React.useEffect(() => {
    if (!slugTouched && nombre) setSlug(slugify(nombre));
  }, [nombre, slugTouched]);

  function fieldError(name: string): string | undefined {
    return result?.fieldErrors?.[name];
  }

  function setDia(dia: keyof HorariosLugar, valor: string) {
    setHorarios((prev) => ({ ...prev, [dia]: valor.trim() || null }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo", tipo);
    if (tipo === "gastronomico") {
      fd.set("horarios", JSON.stringify(horarios));
    } else {
      fd.delete("horarios");
    }
    startTransition(async () => {
      const r = await action(fd);
      if (r && "error" in r) setResult(r);
      else if (r && r.ok) {
        setResult(null);
        router.refresh();
      }
    });
  }

  const categorias =
    tipo === "gastronomico"
      ? CATEGORIAS_GASTRONOMICO_KEYS.map((k) => ({
          key: k,
          label: CATEGORIAS_GASTRONOMICO[k].label,
        }))
      : CATEGORIAS_ATRACTIVO_KEYS.map((k) => ({
          key: k,
          label: CATEGORIAS_ATRACTIVO[k].label,
        }));

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {result?.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {result.error}
        </div>
      )}

      <input type="hidden" name="tipo" value={tipo} />

      {/* --- Identidad --- */}
      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-tight">Identidad</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="destino_id">Destino</Label>
            <Select
              id="destino_id"
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
            {fieldError("destino_id") && (
              <p className="mt-1 text-xs text-rose-600">
                {fieldError("destino_id")}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="categoria">Categoría</Label>
            <Select
              id="categoria"
              name="categoria"
              defaultValue={initial?.categoria ?? categorias[0]?.key}
              required
            >
              {categorias.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
            {fieldError("categoria") && (
              <p className="mt-1 text-xs text-rose-600">
                {fieldError("categoria")}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={120}
              placeholder={
                tipo === "gastronomico"
                  ? "Ej: La Trattoria del Mar"
                  : "Ej: Playa Mar Azul"
              }
            />
            {fieldError("nombre") && (
              <p className="mt-1 text-xs text-rose-600">
                {fieldError("nombre")}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              required
              maxLength={80}
              placeholder="la-trattoria-del-mar"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Aparece en la URL. Generado del nombre si no lo tocás.
            </p>
            {fieldError("slug") && (
              <p className="mt-1 text-xs text-rose-600">{fieldError("slug")}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="descripcion_corta">Descripción corta</Label>
          <Textarea
            id="descripcion_corta"
            name="descripcion_corta"
            defaultValue={initial?.descripcion_corta ?? ""}
            required
            minLength={20}
            maxLength={200}
            rows={2}
            placeholder="Una línea que resuma el lugar. Mín 20, máx 200 caracteres."
          />
          {fieldError("descripcion_corta") && (
            <p className="mt-1 text-xs text-rose-600">
              {fieldError("descripcion_corta")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="descripcion_larga">Descripción larga</Label>
          <Textarea
            id="descripcion_larga"
            name="descripcion_larga"
            defaultValue={initial?.descripcion_larga ?? ""}
            maxLength={5000}
            rows={5}
            placeholder="Detalle, historia, qué lo hace especial. Opcional."
          />
        </div>
      </section>

      {/* --- Ubicación --- */}
      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-tight">Ubicación</h2>

        <div>
          <Label htmlFor="direccion">Dirección</Label>
          <Input
            id="direccion"
            name="direccion"
            defaultValue={initial?.direccion ?? ""}
            maxLength={200}
            placeholder={
              tipo === "gastronomico"
                ? "Av. 1 e/ 32 y 33"
                : "Frente al mar, altura calle 33"
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="lat">Latitud</Label>
            <Input
              id="lat"
              name="lat"
              type="number"
              step="any"
              defaultValue={initial?.lat ?? ""}
              placeholder="-37.0123"
            />
          </div>
          <div>
            <Label htmlFor="lng">Longitud</Label>
            <Input
              id="lng"
              name="lng"
              type="number"
              step="any"
              defaultValue={initial?.lng ?? ""}
              placeholder="-56.7890"
            />
          </div>
          <div>
            <Label htmlFor="google_maps_url">Link Google Maps</Label>
            <Input
              id="google_maps_url"
              name="google_maps_url"
              type="url"
              defaultValue={initial?.google_maps_url ?? ""}
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>
        </div>
      </section>

      {/* --- Contacto --- */}
      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-tight">Contacto</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="whatsapp">
              WhatsApp{" "}
              {tipo === "gastronomico" && (
                <span className="text-rose-600">*</span>
              )}
            </Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={initial?.whatsapp ?? ""}
              required={tipo === "gastronomico"}
              placeholder="1155555555"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Sin código de país. Lo normalizamos a +549 automáticamente.
            </p>
            {fieldError("whatsapp") && (
              <p className="mt-1 text-xs text-rose-600">
                {fieldError("whatsapp")}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono (opcional)</Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              defaultValue={initial?.telefono ?? ""}
              placeholder="2266555555"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              placeholder="hola@ejemplo.com"
            />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram (usuario)</Label>
            <Input
              id="instagram"
              name="instagram"
              defaultValue={initial?.instagram ?? ""}
              placeholder="latrattoria"
            />
          </div>
          <div>
            <Label htmlFor="website">Sitio web</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={initial?.website ?? ""}
              placeholder="https://..."
            />
          </div>
        </div>
      </section>

      {/* --- Horarios (solo gastro) --- */}
      {tipo === "gastronomico" && (
        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-tight">Horarios</h2>
          <p className="text-sm text-muted-foreground">
            Texto libre por día. Ejemplo: <code>12:00-15:00, 20:00-00:00</code>.
            Dejá vacío si está cerrado ese día.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {DIAS.map((d) => (
              <div key={d.key} className="flex items-center gap-3">
                <Label className="w-24 shrink-0">{d.label}</Label>
                <Input
                  value={horarios[d.key] ?? ""}
                  onChange={(e) => setDia(d.key, e.target.value)}
                  placeholder="12:00-15:00, 20:00-00:00"
                />
              </div>
            ))}
          </div>
          <input
            type="hidden"
            name="horarios"
            value={JSON.stringify(horarios)}
          />
        </section>
      )}

      {/* --- Curaduría (solo admin) --- */}
      {isAdmin && (
        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-tight">Curaduría</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                name="imperdible"
                defaultChecked={initial?.imperdible ?? false}
              />
              <span className="text-sm">
                Imperdible
                <span className="ml-1 text-xs text-muted-foreground">
                  (aparece en la home del destino)
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                name="destacado"
                defaultChecked={initial?.destacado ?? false}
              />
              <span className="text-sm">
                Destacado
                <span className="ml-1 text-xs text-muted-foreground">
                  (prioridad en listados internos)
                </span>
              </span>
            </label>
          </div>
        </section>
      )}

      {/* --- SEO --- */}
      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-tight">SEO (opcional)</h2>
        <div>
          <Label htmlFor="meta_title">Meta title</Label>
          <Input
            id="meta_title"
            name="meta_title"
            defaultValue={initial?.meta_title ?? ""}
            maxLength={70}
            placeholder="Si lo dejás vacío, usamos el nombre."
          />
        </div>
        <div>
          <Label htmlFor="meta_description">Meta description</Label>
          <Textarea
            id="meta_description"
            name="meta_description"
            defaultValue={initial?.meta_description ?? ""}
            maxLength={180}
            rows={2}
            placeholder="Si lo dejás vacío, usamos la descripción corta."
          />
        </div>
      </section>

      <div className="flex justify-end gap-3 border-t border-border pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
