"use client";

import Image from "next/image";
import { Home, BedDouble, UtensilsCrossed, Compass, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import { DatosUtilesButton } from "@/features/datos-utiles/components/DatosUtilesButton";
import type { SearchState, HubTab } from "@/features/home/lib/search-types";
import type { HeaderSession } from "@/features/home/lib/header-session";
import type { Rubro, DatoUtil } from "@/lib/types";

// Las verticales del menú. Las promos ya no son una pestaña: viven en el hero.
const TABS: Array<{ key: HubTab; label: string; icon: LucideIcon }> = [
  { key: "hospedajes", label: "Hospedajes", icon: BedDouble },
  { key: "gastronomia", label: "Gastronomía", icon: UtensilsCrossed },
  { key: "atractivos", label: "Qué hacer", icon: Compass },
];

interface AirbnbTopProps {
  /** Vertical activa; null = landing (ninguna pestaña resaltada). */
  vertical: HubTab | null;
  onChangeVertical: (v: HubTab) => void;
  onGoHub: () => void;
  /**
   * Si el buscador está scopeado a un destino, su nombre (con 🏠) ocupa el
   * inicio de la pill: tocarlo vuelve al home del destino (onResetDestino) y la
   * ✕ (onGoHub) cierra el destino y vuelve a la red.
   */
  scopedDestino?: { slug: string; nombre: string } | null;
  /** Vuelve al home del destino scopeado (limpia verticales y filtros). */
  onResetDestino?: () => void;
  search: SearchState;
  onOpenSearch: () => void;
  session: HeaderSession;
  rubros?: Rubro[];
  datosUtiles?: DatoUtil[];
}

export function AirbnbTop({
  vertical,
  onChangeVertical,
  onGoHub,
  scopedDestino = null,
  onResetDestino,
  search,
  onOpenSearch,
  session,
  rubros = [],
  datosUtiles = [],
}: AirbnbTopProps) {
  const tabs = TABS;

  // El 2º/3º segmento del pill cambia según la vertical activa.
  const pill =
    vertical === "gastronomia" || vertical === "atractivos"
      ? { b: search.tipo || (vertical === "gastronomia" ? "Tipo" : "Qué"), c: search.cuando || "Cuándo" }
      : { b: search.cuando || "Cuándo", c: search.quien || "Quién" };

  const Verticales = ({ size }: { size: number }) =>
    tabs.map((v) => {
      const Icon = v.icon;
      const active = vertical === v.key;
      return (
        <button
          key={v.key}
          type="button"
          onClick={() => onChangeVertical(v.key)}
          aria-pressed={active}
          className={cn(
            "inline-flex shrink-0 flex-col items-center gap-1 border-b-2 px-2 pb-1 text-xs transition",
            active
              ? "border-primary font-semibold text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon size={size} aria-hidden />
          <span>{v.label}</span>
        </button>
      );
    });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container">
        {/* Fila superior: logo · verticales (desktop) · usuario */}
        <div className="flex h-16 items-center gap-4">
          <button
            type="button"
            onClick={onGoHub}
            className="flex items-center gap-2 text-left transition hover:opacity-80"
            aria-label="Mis Escapadas — Inicio"
          >
            <Image
              src="/images/favicon.png"
              alt="Mis Escapadas"
              width={24}
              height={24}
              className="h-6 w-6"
              priority
            />
            <span className="font-display text-2xl tracking-tight whitespace-nowrap">
              <span className="text-amber-700">Mis</span>{" "}
              <span className="text-sky-500">Escapadas</span>
            </span>
          </button>

          <nav
            className="mx-auto hidden items-center gap-6 md:flex"
            aria-label="Categorías"
          >
            <Verticales size={18} />
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-3">
            <DatosUtilesButton rubros={rubros} datosUtiles={datosUtiles} />
            {session.authed && <UserMenu session={session} />}
          </div>
        </div>

        {/* Search pill compacta. Sin destino: un solo botón que abre el panel.
            Scopeada a un destino: 🏠+nombre vuelve a su home (onResetDestino),
            el resto abre el panel y la ✕ cierra el destino y vuelve a la red. */}
        <div className="pb-3">
          <div className="flex w-full max-w-2xl items-center gap-2 rounded-full border border-border bg-card py-2 pl-4 pr-2 text-sm shadow-sm transition hover:shadow-md md:mx-auto">
            {scopedDestino ? (
              <>
                <button
                  type="button"
                  onClick={onResetDestino}
                  aria-label={`Volver al inicio de ${scopedDestino.nombre}`}
                  className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground transition hover:text-primary"
                >
                  <Home className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">{scopedDestino.nombre}</span>
                </button>
                <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-muted-foreground"
                >
                  <span className="truncate">{pill.b}</span>
                  {pill.c && (
                    <>
                      <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />
                      <span className="hidden truncate sm:block">{pill.c}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onGoHub}
                  aria-label={`Salir de ${scopedDestino.nombre} y ver toda la red`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenSearch}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate font-medium text-foreground">
                  {search.donde || "Dónde"}
                </span>
                <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
                <span className="truncate text-muted-foreground">{pill.b}</span>
                {pill.c && (
                  <>
                    <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />
                    <span className="hidden truncate text-muted-foreground sm:block">
                      {pill.c}
                    </span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Buscar"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Search className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Verticales mobile — scroll horizontal debajo de la pill */}
        <nav
          className="flex items-center gap-6 overflow-x-auto pb-3 [scrollbar-width:none] md:hidden"
          aria-label="Categorías"
        >
          <Verticales size={20} />
        </nav>
      </div>
    </header>
  );
}
