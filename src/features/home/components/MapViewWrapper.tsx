"use client";

import dynamic from "next/dynamic";
import type { Bioma } from "@/types/database";

interface DestinoMapPoint {
  slug: string;
  nombre: string;
  region: string | null;
  lat: number;
  lng: number;
  biomas: Bioma[];
  hospedajes_count: number;
}

// Cargar Leaflet solo en cliente — Next.js 15 no permite dynamic({ssr:false})
// en server components, así que envolvemos en este client wrapper.
const MapView = dynamic(
  () => import("./MapView").then((m) => m.MapView),
  { ssr: false }
);

export function MapViewWrapper({
  destinos,
}: {
  destinos: DestinoMapPoint[];
}) {
  return <MapView destinos={destinos} />;
}
