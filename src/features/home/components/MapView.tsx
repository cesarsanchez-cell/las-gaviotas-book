"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import type { Map, LayerGroup } from "leaflet";
import type { Bioma } from "@/types/database";
import { biomaColor, biomaLabel } from "./BiomaIcon";

interface DestinoMapPoint {
  slug: string;
  nombre: string;
  region: string | null;
  lat: number;
  lng: number;
  biomas: Bioma[];
  hospedajes_count: number;
}

interface MapViewProps {
  destinos: DestinoMapPoint[];
}

const BIOMAS_ORDERED: Bioma[] = [
  "playa",
  "bosque",
  "montana",
  "sierra",
  "lago",
  "desierto",
];

export function MapView({ destinos }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const markersLayer = useRef<LayerGroup | null>(null);
  const [selected, setSelected] = useState<DestinoMapPoint | null>(null);
  const [filtroBioma, setFiltroBioma] = useState<Bioma | "todos">("todos");
  // Necesario para retrigger el effect de markers una vez que el map terminó
  // de inicializarse (el init es async — sin esto, el primer render dibuja
  // markers antes de tener mapInstance.current y el fitBounds inicial no corre).
  const [mapReady, setMapReady] = useState(false);

  // Init Leaflet (solo en cliente, después de mount).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // Asegurar CSS de leaflet (loadeo dinámico).
      if (typeof document !== "undefined") {
        const existing = document.querySelector('link[data-leaflet="1"]');
        if (!existing) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          link.setAttribute("data-leaflet", "1");
          document.head.appendChild(link);
        }
      }
      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        // Default a Argentina entera. Después de cargar los markers ajustamos
        // el viewport con fitBounds para acercarnos a donde están los destinos.
        center: [-38.5, -63.6],
        zoom: 4,
        minZoom: 3,
        maxZoom: 14,
        zoomControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      mapInstance.current = map;
      markersLayer.current = L.layerGroup().addTo(map);
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      setMapReady(false);
    };
  }, []);

  // Actualizar markers cuando cambian destinos filtrados o filtro.
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !markersLayer.current || !mapInstance.current) return;

      markersLayer.current.clearLayers();

      const filtrados = destinos.filter((d) => {
        if (filtroBioma === "todos") return true;
        return d.biomas.includes(filtroBioma);
      });

      for (const d of filtrados) {
        const primary: Bioma = d.biomas[0] ?? "playa";
        const color = biomaColor(primary);
        const icon = L.divIcon({
          className: "me-mappin",
          html: `<span class="me-mappin__ring" style="--c:${color}"></span><span class="me-mappin__dot" style="--c:${color}"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const marker = L.marker([d.lat, d.lng], { icon });
        marker.on("click", () => setSelected(d));
        marker.addTo(markersLayer.current!);
      }

      // Auto-fit del viewport a los pins visibles. Acomoda el zoom según la
      // dispersión geográfica — si todos están en la costa bonaerense, se
      // acerca; si hay uno en Patagonia y otro en NOA, hace zoom out para
      // mostrarlos a todos.
      if (filtrados.length > 0) {
        const bounds = L.latLngBounds(
          filtrados.map((d) => L.latLng(d.lat, d.lng))
        );
        // 1 punto: setView con zoom 11 (nivel pueblo) — fitBounds con un solo
        // punto haría zoom máximo, queda demasiado cerca.
        if (filtrados.length === 1) {
          const only = filtrados[0];
          mapInstance.current.setView([only.lat, only.lng], 11, {
            animate: true,
          });
        } else {
          mapInstance.current.fitBounds(bounds, {
            padding: [80, 80],
            maxZoom: 10,
            animate: true,
          });
        }
      } else {
        // Sin pins (filtro sin matches), volver al overview de Argentina.
        mapInstance.current.setView([-38.5, -63.6], 4, { animate: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [destinos, filtroBioma, mapReady]);

  return (
    <div className="relative h-full w-full">
      <style>{`
        .me-mappin { position: relative; width: 14px; height: 14px; }
        .me-mappin__dot {
          position: absolute; inset: 0;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: var(--c);
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
          z-index: 1;
        }
        .me-mappin__ring {
          position: absolute; inset: 0;
          border-radius: 50%;
          background: var(--c);
          opacity: 0.3;
          animation: me-mappin-pulse 2.4s cubic-bezier(.22,1,.36,1) infinite;
          pointer-events: none;
        }
        @keyframes me-mappin-pulse {
          0%   { transform: scale(0.6); opacity: 0.4; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .me-mappin__ring { animation: none; }
        }
      `}</style>

      <div ref={mapRef} className="absolute inset-0" />

      {/* Top bar overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[400]">
        <div className="container pointer-events-auto py-3">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-md backdrop-blur">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al hub
            </Link>
            <span className="text-sm font-medium text-foreground">
              {destinos.length} destino{destinos.length === 1 ? "" : "s"} en
              Argentina
            </span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFiltroBioma("todos")}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                  filtroBioma === "todos"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                Todos
              </button>
              {BIOMAS_ORDERED.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setFiltroBioma(b)}
                  className="rounded-full border px-2.5 py-0.5 text-xs font-medium transition"
                  style={
                    filtroBioma === b
                      ? {
                          backgroundColor: biomaColor(b),
                          color: "white",
                          borderColor: biomaColor(b),
                        }
                      : {
                          backgroundColor: "transparent",
                          color: "hsl(var(--foreground))",
                          borderColor: "hsl(var(--border))",
                        }
                  }
                >
                  {biomaLabel(b)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar derecho cuando hay selected */}
      {selected && (
        <aside className="absolute right-0 top-0 z-[400] h-full w-80 max-w-[90vw] overflow-y-auto border-l border-border bg-card shadow-xl">
          <div
            className="relative flex h-44 items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${biomaColor(selected.biomas[0] ?? "playa")} 0%, ${biomaColor(selected.biomas[1] ?? selected.biomas[0] ?? "playa")} 100%)`,
            }}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Cerrar"
              className="absolute right-3 top-3 rounded-full bg-white/95 p-1.5 text-foreground transition hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5">
            {selected.region && (
              <p className="text-xs text-muted-foreground">{selected.region}</p>
            )}
            <h3 className="mt-1 font-display text-2xl tracking-tight text-foreground">
              {selected.nombre}
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selected.biomas.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: biomaColor(b) }}
                >
                  {biomaLabel(b)}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {selected.hospedajes_count} hospedaje
              {selected.hospedajes_count === 1 ? "" : "s"} verificado
              {selected.hospedajes_count === 1 ? "" : "s"}.
            </p>
            <Link
              href={`/${selected.slug}`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Entrar al destino
            </Link>
          </div>
        </aside>
      )}
    </div>
  );
}
