import Link from "next/link";
import { Container } from "./Container";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/40">
      <Container size="xl">
        <div className="flex flex-col gap-8 py-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-display text-lg tracking-tight">
              {siteConfig.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Directorio premium de hospedajes verificados.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/login" className="text-sm font-medium text-foreground hover:text-primary transition">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="text-sm text-muted-foreground hover:text-foreground transition">
              Sumar mi propuesta
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
          </p>
        </div>
      </Container>
    </footer>
  );
}
