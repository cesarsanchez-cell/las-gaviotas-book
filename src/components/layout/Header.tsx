"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Building2, Utensils, Camera } from "lucide-react";
import { Container } from "./Container";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface HeaderProps {
  destinoSlug: string;
  destinoNombre: string;
}

/**
 * Header del sitio público con doble marca: Mis Escapadas (red) | {Destino}
 * (comunidad). Los dos con peso visual equivalente — cada uno clickeable a
 * su raíz. Mis Escapadas → /  (hub de destinos), Destino → /{slug}.
 *
 * En desktop, la nav vive inline a la derecha. En mobile colapsa a un
 * botón hamburguesa que abre un panel slide-in con los links.
 */
export function Header({ destinoSlug, destinoNombre }: HeaderProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Cerrar al navegar.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Cerrar con Escape y bloquear scroll del body mientras está abierto.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const navItems = [
    {
      href: `/${destinoSlug}/hospedajes`,
      label: "Hospedajes",
      icon: Building2,
    },
    {
      href: `/${destinoSlug}/gastronomia`,
      label: "Gastronomía",
      icon: Utensils,
    },
    {
      href: `/${destinoSlug}/atractivos`,
      label: "Atractivos",
      icon: Camera,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Container size="xl">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="font-display text-lg tracking-tight text-foreground transition hover:text-primary md:text-xl"
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
                className="truncate font-display text-lg tracking-tight text-foreground transition hover:text-primary md:text-xl"
                aria-label={`Inicio de ${destinoNombre}`}
              >
                {destinoNombre}
              </Link>
            </div>

            {/* Nav inline (desktop) */}
            <nav className="hidden items-center gap-1 text-sm md:flex md:gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-foreground transition hover:bg-secondary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Hamburguesa (mobile) */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition hover:bg-secondary md:hidden"
              aria-label="Abrir menú"
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </Container>
      </header>

      {/* Drawer mobile + backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[100] md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity",
            open ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Panel */}
        <aside
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className={cn(
            "absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-card shadow-xl transition-transform",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <p className="font-display text-lg tracking-tight">
              {destinoNombre}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition hover:bg-secondary"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 text-sm">
            <Link
              href={`/${destinoSlug}`}
              className="flex items-center gap-3 rounded-md px-3 py-3 font-medium text-foreground transition hover:bg-secondary"
            >
              Inicio
            </Link>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-foreground transition hover:bg-secondary"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-4 border-t border-border pt-4">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary"
              >
                {siteConfig.name} — red de portales turísticos
              </Link>
            </div>
          </nav>
        </aside>
      </div>
    </>
  );
}
