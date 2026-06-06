"use client";

import { Home, BedDouble, UtensilsCrossed, Compass, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PinHeart } from "./PinHeart";
import { UserMenu } from "./UserMenu";
import type { SearchState, HubTab } from "@/features/home/lib/search-types";
import type { HeaderSession } from "@/features/home/lib/header-session";

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
  /** Vuelve al landing del contexto actual (destino o red), sin salir a `/`. */
  onGoLanding: () => void;
  search: SearchState;
  onOpenSearch: () => void;
  session: HeaderSession;
}

export function AirbnbTop({
  vertical,
  onChangeVertical,
  onGoHub,
  onGoLanding,
  search,
  onOpenSearch,
  session,
}: AirbnbTopProps) {
  const tabs = TABS;

  // El 2º/3º segmento del pill cambia según la vertical activa.
  const pill =
    vertical === "gastronomia" || vertical === "atractivos"
      ? { b: search.tipo || (vertical === "gastronomia" ? "Tipo" : "Qué"), c: search.cuando || "Cuándo" }
      : { b: search.cuando || "Cuándo", c: search.quien || "Quién" };

  const Verticales = ({ size }: { size: number }) => (
    <>
      {/* Inicio: vuelve al landing (promos + combos) del contexto actual. */}
      <button
        type="button"
        onClick={onGoLanding}
        aria-pressed={vertical === null}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 border-b-2 px-1 pb-1 text-sm transition",
          vertical === null
            ? "border-primary font-semibold text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <Home size={size} aria-hidden />
        <span>Inicio</span>
      </button>
      {tabs.map((v) => {
        const Icon = v.icon;
        const active = vertical === v.key;
        return (
          <button
            key={v.key}
            type="button"
            onClick={() => onChangeVertical(v.key)}
            aria-pressed={active}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 px-1 pb-1 text-sm transition",
              active
                ? "border-primary font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={size} aria-hidden />
            <span>{v.label}</span>
          </button>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container">
        {/* Fila superior: logo · verticales (desktop) · usuario */}
        <div className="flex h-16 items-center gap-4">
          <button
            type="button"
            onClick={onGoHub}
            className="flex items-center gap-2 text-left"
            aria-label="Mis Escapadas — Inicio"
          >
            <span className="wordmark-mis">
              <PinHeart size={22} />
            </span>
            <span className="font-display text-lg tracking-tight md:text-xl">
              <span className="wordmark-mis">Mis</span>{" "}
              <span className="wordmark-esc">Escapadas</span>
            </span>
          </button>

          <nav
            className="mx-auto hidden items-center gap-6 md:flex"
            aria-label="Categorías"
          >
            <Verticales size={18} />
          </nav>

          <div className="ml-auto md:ml-0">
            <UserMenu session={session} />
          </div>
        </div>

        {/* Search pill compacta — abre el panel expandido */}
        <div className="pb-3">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex w-full max-w-2xl items-center gap-2 rounded-full border border-border bg-card py-2 pl-4 pr-2 text-sm shadow-sm transition hover:shadow-md md:mx-auto"
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
            <span className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Search className="h-4 w-4" aria-hidden />
            </span>
          </button>
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
