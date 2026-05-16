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
  Inbox,
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
  { href: "/admin/consultas", label: "Consultas", icon: Inbox },
  { href: "/admin/admins", label: "Administradores", icon: Users, superOnly: true },
  { href: "/admin/fotos", label: "Fotos", icon: ImageIcon, soon: true },
];

interface AdminSidebarProps {
  email: string;
  nombre: string | null;
  isSuperAdmin: boolean;
  destinoNombre: string | null;
}

export function AdminSidebar({
  email,
  nombre,
  isSuperAdmin,
  destinoNombre,
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

      <nav className="flex-1 space-y-0.5 px-3">
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

        <div className="mt-6 border-t border-border pt-3">
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
          <div className="flex items-center gap-1.5">
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
