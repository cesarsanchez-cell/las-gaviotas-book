// JSON-LD schema.org helpers para SEO

import { siteConfig } from "@/config/site";
import { AMENITIES } from "@/config/amenities";
import type { Hospedaje } from "@/types/domain";
import type { DestinoRow } from "@/types/database";
import { getFotoUrl } from "@/lib/storage";

const TIPO_TO_SCHEMA: Record<string, string> = {
  hotel: "Hotel",
  apart: "LodgingBusiness",
  cabana: "LodgingBusiness",
  hosteria: "BedAndBreakfast",
  camping: "Campground",
  casa: "VacationRental",
  departamento: "Apartment",
};

const AMENITY_TO_SCHEMA: Record<string, string> = {
  wifi: "Free WiFi",
  playa_cerca: "Beach Access",
  estacionamiento: "Parking",
  aire_acondicionado: "Air Conditioning",
  calefaccion: "Heating",
  tv: "Television",
  cocina: "Kitchen",
  parrilla: "BBQ Grill",
  ventilador: "Fan",
  pet_friendly: "Pets Allowed",
  apto_ninos: "Family Friendly",
  banera: "Bathtub",
  desayuno: "Breakfast",
  lavarropas: "Washing Machine",
  cochera_techada: "Covered Parking",
  patio: "Garden",
  deck_solarium: "Sun Deck",
};

interface HospedajeForJsonLd {
  nombre: string;
  slug: string;
  tipo: Hospedaje["tipo"];
  descripcion_corta: string;
  descripcion_larga?: string | null;
  direccion: string;
  lat?: number | null;
  lng?: number | null;
  whatsapp: string;
  email?: string | null;
  amenities: string[];
  destino: { nombre: string; region?: string | null; provincia?: string | null; pais?: string | null };
  fotos: { storage_path: string; alt?: string | null }[];
}

export function buildHospedajeJsonLd(h: HospedajeForJsonLd, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": TIPO_TO_SCHEMA[h.tipo] ?? "LodgingBusiness",
    name: h.nombre,
    description: h.descripcion_larga || h.descripcion_corta,
    url,
    image: h.fotos.slice(0, 6).map((f) => getFotoUrl(f.storage_path)),
    address: {
      "@type": "PostalAddress",
      streetAddress: h.direccion,
      addressLocality: h.destino.nombre,
      addressRegion: h.destino.region ?? h.destino.provincia ?? undefined,
      addressCountry: h.destino.pais ?? "AR",
    },
    ...(h.lat && h.lng
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: h.lat,
            longitude: h.lng,
          },
        }
      : {}),
    telephone: h.whatsapp,
    ...(h.email ? { email: h.email } : {}),
    amenityFeature: h.amenities
      .filter((a) => AMENITIES[a as keyof typeof AMENITIES])
      .map((a) => ({
        "@type": "LocationFeatureSpecification",
        name: AMENITY_TO_SCHEMA[a] ?? AMENITIES[a as keyof typeof AMENITIES]?.label,
      })),
  };
}

export function buildDestinoJsonLd(d: Pick<DestinoRow, "nombre" | "region" | "provincia" | "pais" | "descripcion_corta" | "lat" | "lng">, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: d.nombre,
    description: d.descripcion_corta,
    url,
    ...(d.lat && d.lng
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: d.lat,
            longitude: d.lng,
          },
        }
      : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: d.nombre,
      addressRegion: d.region ?? d.provincia ?? undefined,
      addressCountry: d.pais ?? "AR",
    },
  };
}

// =============================================================================
// Lugares (gastronomía + atractivos)
// =============================================================================

interface LugarForJsonLd {
  tipo: "gastronomico" | "atractivo";
  categoria: string;
  nombre: string;
  descripcion_corta: string;
  descripcion_larga?: string | null;
  direccion?: string | null;
  lat?: number | null;
  lng?: number | null;
  whatsapp?: string | null;
  telefono?: string | null;
  email?: string | null;
  website?: string | null;
  horarios?: Partial<Record<"lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom", string | null | undefined>> | null;
  destino: { nombre: string; region?: string | null; provincia?: string | null; pais?: string | null };
  fotos: { storage_path: string; alt?: string | null }[];
}

const DIA_TO_SCHEMA: Record<string, string> = {
  lun: "Mo",
  mar: "Tu",
  mie: "We",
  jue: "Th",
  vie: "Fr",
  sab: "Sa",
  dom: "Su",
};

function buildOpeningHoursSpec(
  horarios:
    | Partial<Record<"lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom", string | null | undefined>>
    | null
    | undefined
) {
  if (!horarios) return undefined;
  const specs: { "@type": "OpeningHoursSpecification"; dayOfWeek: string; opens: string; closes: string }[] = [];
  for (const [dia, value] of Object.entries(horarios)) {
    if (!value) continue;
    const schemaDay = DIA_TO_SCHEMA[dia];
    if (!schemaDay) continue;
    const rangos = value.split(",").map((r) => r.trim()).filter(Boolean);
    for (const rango of rangos) {
      const m = rango.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/);
      if (!m) continue;
      specs.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${schemaDay === "Mo" ? "Monday" : schemaDay === "Tu" ? "Tuesday" : schemaDay === "We" ? "Wednesday" : schemaDay === "Th" ? "Thursday" : schemaDay === "Fr" ? "Friday" : schemaDay === "Sa" ? "Saturday" : "Sunday"}`,
        opens: m[1],
        closes: m[2],
      });
    }
  }
  return specs.length > 0 ? specs : undefined;
}

export function buildLugarJsonLd(l: LugarForJsonLd, url: string) {
  const type = l.tipo === "gastronomico" ? "Restaurant" : "TouristAttraction";

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    name: l.nombre,
    description: l.descripcion_larga || l.descripcion_corta,
    url,
    image: l.fotos.slice(0, 6).map((f) => getFotoUrl(f.storage_path)),
  };

  if (l.direccion) {
    base.address = {
      "@type": "PostalAddress",
      streetAddress: l.direccion,
      addressLocality: l.destino.nombre,
      addressRegion: l.destino.region ?? l.destino.provincia ?? undefined,
      addressCountry: l.destino.pais ?? "AR",
    };
  }

  if (l.lat && l.lng) {
    base.geo = {
      "@type": "GeoCoordinates",
      latitude: l.lat,
      longitude: l.lng,
    };
  }

  if (l.whatsapp || l.telefono) base.telephone = l.whatsapp ?? l.telefono;
  if (l.email) base.email = l.email;
  if (l.website) base.sameAs = [l.website];

  if (l.tipo === "gastronomico") {
    const spec = buildOpeningHoursSpec(l.horarios);
    if (spec) base.openingHoursSpecification = spec;
    base.servesCuisine = l.categoria;
  }

  return base;
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`,
    })),
  };
}
