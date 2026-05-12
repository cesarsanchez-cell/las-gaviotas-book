"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Image as ImageIcon,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { signOutAction } from "@/features/admin/lib/session-actions";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/hospedajes", label: "Hospedajes", icon: Building2 },
  { href: "/admin/fotos", label: "Fotos", icon: ImageIcon, soon: true },
];

interface AdminSidebarProps {
  email: string;
  nombre: string | null;
}

export function AdminSidebar({ email, nombre }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card">
      <div className="p-6">
        <Link href="/admin" className="block font-display text-xl tracking-tight">
          {siteConfig.shortName}
        </Link>
        <p className="text-xs text-muted-foreground">Panel administración</p>
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
          <p className="truncate font-medium text-foreground">
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
