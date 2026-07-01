"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  BedDouble,
  UtensilsCrossed,
  Compass,
  Home,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
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
 * estética que el AirbnbTop del hub: logo Mis Escapadas, las verticales y el menú
 * de usuario. Incluye la pill de búsqueda para mantener la navegación visible.
 */
export function DestinoTopBar({
  destinoSlug,
  destinoNombre,
  session,
  rubros,
  datosUtiles,
  searchParams,
}: {
  destinoSlug: string;
  destinoNombre: string;
  session: HeaderSession;
  rubros: Rubro[];
  datosUtiles: DatoUtil[];
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Extraer parámetros de búsqueda
  const pickStr = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const donde = pickStr(searchParams?.donde) || "";
  const cuando = pickStr(searchParams?.cuando) || "";
  const quien = pickStr(searchParams?.quien) || "";

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

  const goBack = () => {
    router.back();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container">
        <div className="flex h-16 items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 transition hover:opacity-80"
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
          </Link>

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

        {/* Search pill — permite retroceder en la búsqueda */}
        <div className="pb-3">
          <div className="flex w-full max-w-2xl items-center gap-2 rounded-full border border-border bg-card py-2 pl-4 pr-2 text-sm shadow-sm transition hover:shadow-md md:mx-auto">
            <button
              type="button"
              onClick={goBack}
              className="flex min-w-0 flex-1 items-center gap-2 text-left text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate font-medium">{donde || destinoNombre}</span>
              {cuando && (
                <>
                  <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />
                  <span className="hidden truncate sm:block">{cuando}</span>
                </>
              )}
              {quien && (
                <>
                  <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />
                  <span className="hidden truncate sm:block">{quien}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={goBack}
              aria-label="Retroceder"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
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
