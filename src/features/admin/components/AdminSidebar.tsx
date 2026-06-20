"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Image as ImageIcon,
  ShieldCheck,
  LogOut,
  ExternalLink,
  Users,
  UserCog,
  MapPinned,
  Building,
  Inbox,
  Utensils,
  Camera,
  Tag,
  Layers,
  UserCircle,
  Map,
  Trees,
} from "lucide-react";
import { signOutAction } from "@/features/admin/lib/session-actions";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  soon?: boolean;
  superOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/validaciones", label: "Cola de validación", icon: ShieldCheck },
  { href: "/admin/hospedajes", label: "Hospedajes", icon: Building2 },
  { href: "/admin/gastronomia", label: "Gastronomía", icon: Utensils },
  { href: "/admin/atractivos", label: "Qué hacer", icon: Camera },
  { href: "/admin/atracciones", label: "Atracciones", icon: Trees },
  { href: "/admin/promos", label: "Promos", icon: Tag },
  { href: "/admin/combos", label: "Combos", icon: Layers },
  { href: "/admin/consultas", label: "Consultas", icon: Inbox },
  { href: "/admin/responsables", label: "Responsables", icon: UserCog },
  { href: "/admin/regiones", label: "Regiones", icon: MapPinned, superOnly: true },
  { href: "/admin/ciudades", label: "Ciudades", icon: Building, superOnly: true },
  { href: "/admin/zonas", label: "Zonas", icon: Map, superOnly: true },
  { href: "/admin/destinos", label: "Destinos", icon: MapPinned },
  { href: "/admin/admins", label: "Administradores", icon: Users, superOnly: true },
  { href: "/admin/perfil", label: "Mi perfil", icon: UserCircle },
  { href: "/admin/fotos", label: "Fotos", icon: ImageIcon, soon: true },
];

interface AdminSidebarProps {
  email: string;
  nombre: string | null;
  isSuperAdmin: boolean;
  destinoNombre: string | null;
  /** Si el admin tambien tiene responsabilidades (hospedajes o gastros propios). */
  alsoIsResponsable?: boolean;
  /** Cantidad de hospedajes a su cargo (para el tooltip del badge). */
  respHospedajes?: number;
  /** Cantidad de gastronomicos a su cargo (para el tooltip del badge). */
  respGastronomicos?: number;
}

function pluralizar(n: number, sing: string, plural: string): string {
  return `${n} ${n === 1 ? sing : plural}`;
}

export function AdminSidebar({
  email,
  nombre,
  isSuperAdmin,
  destinoNombre,
  alsoIsResponsable = false,
  respHospedajes = 0,
  respGastronomicos = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const visibleNav = NAV.filter((item) => !item.superOnly || isSuperAdmin);
  const scopeLabel = isSuperAdmin
    ? "Super admin"
    : destinoNombre
      ? `Admin · ${destinoNombre}`
      : "Admin";

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card">
      <div className="p-6">
        <Link href="/admin" className="block font-display text-xl tracking-tight">
          {siteConfig.shortName}
        </Link>
        {destinoNombre ? (
          <p className="mt-0.5 font-display text-base tracking-tight text-foreground">
            {destinoNombre}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">Panel administración</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {visibleNav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.soon ? "#" : item.href}
              aria-disabled={item.soon}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary",
                item.soon && "pointer-events-none opacity-50"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="text-[10px] uppercase tracking-wider">
                  pronto
                </span>
              )}
            </Link>
          );
        })}

        <div className="mt-6 space-y-0.5 border-t border-border pt-3">
          {alsoIsResponsable && (
            <Link
              href="/panel"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary"
            >
              <Building2 className="h-4 w-4" aria-hidden />
              <span>Ir a mi panel de operador</span>
            </Link>
          )}
          <Link
            href={`/${siteConfig.defaultDestino}`}
            target="_blank"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            <span>Ver sitio público</span>
          </Link>
        </div>
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 px-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                isSuperAdmin
                  ? "bg-primary/10 text-primary"
                  : "bg-amber-100 text-amber-800"
              )}
            >
              {scopeLabel}
            </span>
            {alsoIsResponsable && (
              <span
                title={`También gestiona ${[
                  respHospedajes > 0
                    ? pluralizar(respHospedajes, "hospedaje", "hospedajes")
                    : null,
                  respGastronomicos > 0
                    ? pluralizar(
                        respGastronomicos,
                        "gastronómico",
                        "gastronómicos"
                      )
                    : null,
                ]
                  .filter(Boolean)
                  .join(" y ")} como operador.`}
                className="cursor-help rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800"
              >
                + Operador
              </span>
            )}
          </div>
          <p className="mt-1.5 truncate font-medium text-foreground">
            {nombre ?? "Admin"}
          </p>
          <p className="truncate text-muted-foreground">{email}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
