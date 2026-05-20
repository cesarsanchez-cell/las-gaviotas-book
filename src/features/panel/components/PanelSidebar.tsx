"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Inbox,
  LogOut,
  ExternalLink,
  Utensils,
  UserCircle,
} from "lucide-react";
import { signOutPanelAction } from "@/features/panel/lib/session-actions";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/panel", label: "Mi panel", icon: LayoutDashboard, exact: true },
  { href: "/panel/hospedajes", label: "Mis hospedajes", icon: Building2 },
  { href: "/panel/lugares", label: "Mis gastronómicos", icon: Utensils },
  { href: "/panel/leads", label: "Consultas", icon: Inbox },
  { href: "/panel/perfil", label: "Mi perfil", icon: UserCircle },
];

interface PanelSidebarProps {
  email: string;
  nombre: string | null;
}

export function PanelSidebar({ email, nombre }: PanelSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card">
      <div className="p-6">
        <Link
          href="/panel"
          className="block font-display text-xl tracking-tight"
        >
          {siteConfig.shortName}
        </Link>
        <p className="text-xs text-muted-foreground">Panel responsable</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="flex-1">{item.label}</span>
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
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
              Responsable
            </span>
          </div>
          <p className="mt-1.5 truncate font-medium text-foreground">
            {nombre ?? "Responsable"}
          </p>
          <p className="truncate text-muted-foreground">{email}</p>
        </div>
        <form action={signOutPanelAction}>
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
