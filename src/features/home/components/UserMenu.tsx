"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutHomeAction } from "@/features/home/lib/actions";
import type { HeaderSession } from "@/features/home/lib/header-session";

/**
 * Menú de usuario del header público (estilo Airbnb: botón redondeado con
 * hamburguesa + avatar, abre dropdown). Adaptado a los roles reales del
 * proyecto — sin features de huésped (no hay login de huéspedes en Etapa 1).
 */
export function UserMenu({ session }: { session: HeaderSession }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition hover:bg-secondary";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menú de usuario"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-3 pr-1.5 shadow-sm transition hover:shadow-md"
      >
        <Menu className="h-4 w-4 text-foreground" aria-hidden />
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground">
          {session.authed ? (
            <span className="text-sm font-semibold uppercase">M</span>
          ) : (
            <User className="h-5 w-5" aria-hidden />
          )}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          {!session.authed ? (
            <>
              <Link href="/login" role="menuitem" className={cn(itemClass, "font-semibold")}>
                Iniciar sesión
              </Link>
              <Link href="/registro" role="menuitem" className={itemClass}>
                Sumar mi propuesta
              </Link>
            </>
          ) : (
            <>
              <Link
                href={session.homeHref}
                role="menuitem"
                className={cn(itemClass, "font-semibold")}
              >
                {session.rol === "admin" ? "Panel admin" : "Mi panel"}
              </Link>
              <Link href="/registro" role="menuitem" className={itemClass}>
                Sumar mi propuesta
              </Link>
              <div className="my-1 border-t border-border" />
              <form action={signOutHomeAction}>
                <button type="submit" role="menuitem" className={itemClass}>
                  Cerrar sesión
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
