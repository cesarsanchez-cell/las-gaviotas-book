import type { Metadata } from "next";
import { listDestinosMini } from "@/features/regiones/lib/queries";
import { MapViewWrapper } from "@/features/home/components/MapViewWrapper";

export const metadata: Metadata = {
  title: "Mapa — Mis Escapadas",
  description:
    "Mapa interactivo de todos los destinos turísticos de la red Mis Escapadas en Argentina.",
  alternates: { canonical: "/mapa" },
  robots: { index: true, follow: true },
};

export default async function MapaPage() {
  const destinos = await listDestinosMini();

  // Solo destinos con lat/lng definidos pueden plottearse.
  const conCoords = destinos
    .filter((d) => d.lat !== null && d.lng !== null)
    .map((d) => ({
      slug: d.slug,
      nombre: d.nombre,
      region: d.region_label,
      lat: d.lat as number,
      lng: d.lng as number,
      biomas: d.biomas,
      hospedajes_count: d.hospedajes_count,
    }));

  return (
    <main className="fixed inset-0">
      <MapViewWrapper destinos={conCoords} />
    </main>
  );
}
