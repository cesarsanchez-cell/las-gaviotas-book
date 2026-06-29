"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  UtensilsCrossed,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PinHeart } from "@/features/home/components/PinHeart";
import { UserMenu } from "@/features/home/components/UserMenu";
import { DatosUtilesButton } from "@/features/datos-utiles/components/DatosUtilesButton";
import type { HeaderSession } from "@/features/home/lib/header-session";
import type { Rubro, DatoUtil } from "@/lib/types";

interface Tab {
  label: string;
  icon: LucideIcon;
  href: string;
  /** Prefijo de pathname que marca la pestaña como activa (null = nunca). */
  match: string | null;
}

/**
 * Barra superior de las páginas internas del destino (listados y fichas). Misma
 * estética que el AirbnbTop del hub: logo PinHeart + Mis Escapadas, las cuatro
 * verticales y el menú de usuario. Las "pestañas" son links a los listados del
 * destino (no filtran una grilla, como sí pasa en el hub), así el chrome no
 * cambia al navegar hacia adentro. Sin hamburguesa: en mobile las verticales
 * pasan a una fila con scroll horizontal, igual que el hub.
 */
export function DestinoTopBar({
  destinoSlug,
  destinoNombre,
  session,
  rubros,
  datosUtiles,
}: {
  destinoSlug: string;
  destinoNombre: string;
  session: HeaderSession;
  rubros: Rubro[];
  datosUtiles: DatoUtil[];
}) {
  const pathname = usePathname();

  // Las pestañas vuelven al HUB del destino con esa vertical preseleccionada
  // (`?v=...`), NO a los listados viejos. Así el diseño y el buscador siguen
  // siendo los de la home. `match` solo resalta la vertical de la ficha actual
  // (orientación), pero el click siempre lleva al hub. (Las promos viven en el
  // hero del hub, no como pestaña.)
  const tabs: Tab[] = [
    {
      label: "Hospedajes",
      icon: BedDouble,
      href: `/${destinoSlug}?v=hospedajes`,
      match: `/${destinoSlug}/hospedajes`,
    },
    {
      label: "Gastronomía",
      icon: UtensilsCrossed,
      href: `/${destinoSlug}?v=gastronomia`,
      match: `/${destinoSlug}/gastronomia`,
    },
    {
      label: "Qué hacer",
      icon: Compass,
      href: `/${destinoSlug}?v=atractivos`,
      match: `/${destinoSlug}/atractivos`,
    },
  ];

  const Verticales = ({ size }: { size: number }) =>
    tabs.map((t) => {
      const Icon = t.icon;
      const active = t.match ? pathname.startsWith(t.match) : false;
      return (
        <Link
          key={t.label}
          href={t.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 border-b-2 px-1 pb-1 text-sm transition",
            active
              ? "border-primary font-semibold text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon size={size} aria-hidden />
          <span>{t.label}</span>
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container">
        <div className="flex h-16 items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Mis Escapadas — Inicio"
          >
            <span className="wordmark-mis">
              <PinHeart size={22} />
            </span>
            <span className="font-display text-lg tracking-tight md:text-xl">
              <span className="wordmark-mis">Mis</span>{" "}
              <span className="wordmark-esc">Escapadas</span>
            </span>
          </Link>

          <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />
          <Link
            href={`/${destinoSlug}`}
            className="hidden truncate font-display text-base tracking-tight text-foreground transition hover:text-primary sm:block"
          >
            {destinoNombre}
          </Link>

          <nav
            className="mx-auto hidden items-center gap-6 md:flex"
            aria-label="Categorías"
          >
            <Verticales size={18} />
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-3">
            <DatosUtilesButton rubros={rubros} datosUtiles={datosUtiles} />
            <UserMenu session={session} />
          </div>
        </div>

        {/* Verticales mobile — scroll horizontal (sin hamburguesa) */}
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
