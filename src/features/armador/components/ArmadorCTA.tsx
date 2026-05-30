import Link from "next/link";
import { WandSparkles, ArrowRight } from "lucide-react";

/**
 * Banner que invita a abrir el Armador ("Armá tu escapada") de un destino.
 * Se usa al final de la sección de combos del destino y, con un solo destino
 * cargado, en la home. Variante `compact` para encajar dentro del hub.
 */
export function ArmadorCTA({
  destinoSlug,
  destinoNombre,
  compact = false,
}: {
  destinoSlug: string;
  destinoNombre: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link
        href={`/${destinoSlug}/armar`}
        className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition hover:bg-primary/10"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <WandSparkles className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block font-medium text-foreground">
            Armá tu propia escapada
          </span>
          <span className="block text-sm text-muted-foreground">
            Combiná hospedaje, mesa y actividad a tu gusto.
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      </Link>
    );
  }

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/40 p-6 text-center md:p-10">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <WandSparkles className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-2xl tracking-tight text-foreground md:text-3xl">
        ¿No te cierra ninguno? Armá la tuya
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
        Elegí dónde dormir, dónde comer y qué hacer en {destinoNombre}, y
        coordinás todo en un solo mensaje de WhatsApp.
      </p>
      <Link
        href={`/${destinoSlug}/armar`}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Armá tu escapada
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
