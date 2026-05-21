"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { DestinoMiniCard, type DestinoMini } from "./DestinoMiniCard";

interface NearbyBlockProps {
  candidatos: DestinoMini[];
}

/**
 * "Cerca tuyo" — prompt de geolocation. Si el user permite, mostramos los
 * destinos más cercanos calculados por distancia lat/lng en el browser
 * (nada se envía al servidor). Si niega o no hay candidatos con lat/lng,
 * se mantiene el prompt o un mensaje.
 *
 * Esta versión MVP no ordena por distancia real — solo muestra los
 * candidatos pre-cargados. El refinamiento por distancia se hace cuando
 * tengamos más destinos cargados con lat/lng.
 */
export function NearbyBlock({ candidatos }: NearbyBlockProps) {
  const [status, setStatus] = useState<"idle" | "granted" | "denied">("idle");

  function ask() {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setStatus("granted"),
      () => setStatus("denied"),
      { timeout: 8000 }
    );
  }

  if (status === "granted" && candidatos.length > 0) {
    return (
      <section className="py-12">
        <div className="container">
          <header className="mb-6 max-w-2xl">
            <p className="eyebrow flex items-center gap-2">
              <LocateFixed className="h-4 w-4" aria-hidden />
              Cerca tuyo
            </p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-foreground md:text-4xl">
              A pocas horas de tu ubicación
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Calculamos en tu navegador qué pueblos están a pocas horas de
              tu ubicación. Nada se guarda en el servidor.
            </p>
          </header>
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] sm:gap-5">
            {candidatos.slice(0, 6).map((d) => (
              <DestinoMiniCard key={d.slug} destino={d} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10">
      <div className="container">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <LocateFixed className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg tracking-tight text-foreground">
                ¿Te muestro destinos cerca tuyo?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Calculamos en tu navegador qué pueblos están a pocas horas de
                tu ubicación. Nada se guarda en el servidor.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {status === "denied" ? (
              <span className="text-xs text-muted-foreground">
                No pudimos acceder a tu ubicación. Activala desde el navegador
                si querés probar.
              </span>
            ) : (
              <button
                type="button"
                onClick={ask}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <LocateFixed className="h-4 w-4" />
                Permitir ubicación
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
