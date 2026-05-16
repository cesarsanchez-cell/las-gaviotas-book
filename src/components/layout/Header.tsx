import Link from "next/link";
import { Container } from "./Container";
import { siteConfig } from "@/config/site";

interface HeaderProps {
  destinoSlug: string;
  destinoNombre: string;
}

/**
 * Header del sitio público con doble marca: Mis Escapadas (red) | {Destino}
 * (comunidad). Los dos con peso visual equivalente — cada uno clickeable a
 * su raíz. Mis Escapadas → /  (hub de destinos), Destino → /{slug}.
 */
export function Header({ destinoSlug, destinoNombre }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container size="xl">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-display text-xl tracking-tight text-foreground transition hover:text-primary"
              aria-label={`${siteConfig.name} — red de portales turísticos locales`}
            >
              {siteConfig.shortName}
            </Link>
            <span
              className="text-muted-foreground/70 select-none"
              aria-hidden
            >
              ·
            </span>
            <Link
              href={`/${destinoSlug}`}
              className="font-display text-xl tracking-tight text-foreground transition hover:text-primary"
              aria-label={`Hospedajes en ${destinoNombre}`}
            >
              {destinoNombre}
            </Link>
          </div>

          <nav className="flex items-center gap-2 text-sm">
            <Link
              href={`/${destinoSlug}/hospedajes`}
              className="rounded-md px-3 py-2 text-foreground transition hover:bg-secondary"
            >
              Hospedajes
            </Link>
          </nav>
        </div>
      </Container>
    </header>
  );
}
