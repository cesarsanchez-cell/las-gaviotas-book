"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Mail, Building2, UtensilsCrossed } from "lucide-react";
import {
  createResponsableAction,
  type EntidadAsignable,
} from "@/features/admin/lib/responsable-management";

interface Props {
  entidades: EntidadAsignable[];
  /** Si true, agrupa los dropdowns por destino (útil para super admin). */
  showDestino: boolean;
}

type EntidadKey = `${EntidadAsignable["tipo"]}:${string}`;

function keyOf(e: { tipo: EntidadAsignable["tipo"]; id: string }): EntidadKey {
  return `${e.tipo}:${e.id}`;
}

export function NewResponsableForm({ entidades, showDestino }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [invitedMerged, setInvitedMerged] = useState<boolean>(false);
  const [invitedMergedCount, setInvitedMergedCount] = useState<number>(0);
  const [selected, setSelected] = useState<Set<EntidadKey>>(new Set());

  function toggle(e: EntidadAsignable) {
    setSelected((prev) => {
      const next = new Set(prev);
      const k = keyOf(e);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    setInvitedEmail(null);

    const seleccionadas: Array<{ tipo: EntidadAsignable["tipo"]; id: string }> =
      entidades.filter((e) => selected.has(keyOf(e))).map((e) => ({ tipo: e.tipo, id: e.id }));

    const input = {
      email: String(formData.get("email") ?? "").trim(),
      nombre: String(formData.get("nombre") ?? "").trim(),
      entidades: seleccionadas,
    };

    startTransition(async () => {
      const res = await createResponsableAction(input);
      if (res.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      if (res.ok && res.email) {
        setInvitedEmail(res.email);
        setInvitedMerged(res.merged ?? false);
        setInvitedMergedCount(res.mergedCount ?? 0);
        setSelected(new Set());
      }
    });
  }

  if (invitedEmail) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden />
          <div>
            {invitedMerged ? (
              <>
                <p className="font-medium text-emerald-900">
                  Entidades sumadas a una cuenta existente
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  <strong>{invitedEmail}</strong> ya tenía cuenta.{" "}
                  {invitedMergedCount > 0 ? (
                    <>
                      Le sumamos {invitedMergedCount} entidad
                      {invitedMergedCount === 1 ? "" : "es"} a las que ya
                      gestionaba.
                    </>
                  ) : (
                    <>No le sumamos entidades (no tildaste ninguna).</>
                  )}{" "}
                  No le enviamos mail de invitación porque ya tiene su contraseña
                  definida.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-emerald-900">Invitación enviada</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Le mandamos un mail a <strong>{invitedEmail}</strong> con el
                  link para activar su cuenta y definir su contraseña.
                </p>
                <p className="mt-2 text-xs text-emerald-700">
                  El link es válido por 24 horas. Si no le llega, revisá la
                  carpeta de spam o reintentá.
                </p>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setInvitedEmail(null);
            setInvitedMerged(false);
            setInvitedMergedCount(0);
          }}
          className="mt-4 text-sm text-emerald-800 underline"
        >
          Invitar a otro responsable
        </button>
      </div>
    );
  }

  const hospedajes = entidades.filter((e) => e.tipo === "hospedaje");
  const gastros = entidades.filter((e) => e.tipo === "gastronomico");

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="resp-nombre">
            Nombre
          </label>
          <input
            id="resp-nombre"
            name="nombre"
            type="text"
            required
            placeholder="María Pérez"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {fieldErrors.nombre && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.nombre}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="resp-email">
            Email
          </label>
          <input
            id="resp-email"
            name="email"
            type="email"
            required
            placeholder="hola@hospedaje.com"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">
            Entidades a asignar{" "}
            <span className="font-normal text-muted-foreground">
              ({selected.size} seleccionada{selected.size === 1 ? "" : "s"})
            </span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Solo aparecen las entidades sin responsable asignado. Si la entidad
          todavía no está cargada, podés invitar al responsable sin asignar
          nada y vincularlo después.
        </p>

        <EntidadSection
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Hospedajes"
          items={hospedajes}
          selected={selected}
          onToggle={toggle}
          showDestino={showDestino}
        />
        <EntidadSection
          icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
          label="Gastronómicos"
          items={gastros}
          selected={selected}
          onToggle={toggle}
          showDestino={showDestino}
        />

        {fieldErrors.entidades && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.entidades}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        <Mail className="h-4 w-4" />
        {pending
          ? "Enviando invitación…"
          : selected.size === 0
            ? "Invitar sin asignar entidades"
            : "Enviar invitación"}
      </button>
    </form>
  );
}

interface EntidadSectionProps {
  icon: React.ReactNode;
  label: string;
  items: EntidadAsignable[];
  selected: Set<EntidadKey>;
  onToggle: (e: EntidadAsignable) => void;
  showDestino: boolean;
}

function EntidadSection({
  icon,
  label,
  items,
  selected,
  onToggle,
  showDestino,
}: EntidadSectionProps) {
  // Agrupar por destino si corresponde
  const grouped = new Map<string, EntidadAsignable[]>();
  for (const it of items) {
    const key = showDestino ? it.destinoNombre : "all";
    const arr = grouped.get(key) ?? [];
    arr.push(it);
    grouped.set(key, arr);
  }

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
        <span className="ml-auto text-[10px] font-normal normal-case">
          {items.length} disponible{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="max-h-44 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Ninguno disponible.
          </p>
        ) : (
          Array.from(grouped.entries()).map(([destino, list]) => (
            <div key={destino} className="space-y-0.5">
              {showDestino && (
                <p className="mt-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {destino}
                </p>
              )}
              {list.map((it) => (
                <label
                  key={it.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(keyOf(it))}
                    onChange={() => onToggle(it)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="flex-1">{it.nombre}</span>
                </label>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
