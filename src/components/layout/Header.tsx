import Link from "next/link";
import { Container } from "./Container";
import { siteConfig } from "@/config/site";

interface HeaderProps {
  destinoSlug: string;
  destinoNombre: string;
}

export function Header({ destinoSlug, destinoNombre }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container size="xl">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href={`/${destinoSlug}`}
            className="flex items-baseline gap-2"
            aria-label={`${siteConfig.name} — ${destinoNombre}`}
          >
            <span className="font-display text-xl tracking-tight">
              {siteConfig.shortName}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {destinoNombre}
            </span>
          </Link>

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
