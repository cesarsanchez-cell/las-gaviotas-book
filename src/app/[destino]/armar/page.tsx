import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDestinoBySlug, listHospedajesByDestino } from "@/features/hospedajes/lib/queries";
import { listLugaresByDestino } from "@/features/lugares/lib/queries";
import { TIPO_HOSPEDAJE_LABEL } from "@/features/hospedajes/types";
import { getFotoUrl } from "@/lib/storage";
import { ArmadorView, type ArmadorItem } from "@/features/armador/components/ArmadorView";

interface PageProps {
  params: Promise<{ destino: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { destino: destinoSlug } = await params;
  const destino = await getDestinoBySlug(destinoSlug);
  if (!destino) return {};
  return {
    title: `Armá tu escapada — ${destino.nombre}`,
    description: `Combiná hospedaje, gastronomía y actividades de ${destino.nombre} y coordiná todo en un solo mensaje.`,
    alternates: { canonical: `/${destinoSlug}/armar` },
    robots: { index: false }, // herramienta interactiva, no página de contenido
  };
}

function fotoUrl(path?: string): string | null {
  return path ? getFotoUrl(path) : null;
}

export default async function ArmarPage({ params }: PageProps) {
  const { destino: destinoSlug } = await params;
  const destino = await getDestinoBySlug(destinoSlug);
  if (!destino) notFound();

  const [hospedajesRaw, gastroRaw, atractivosRaw] = await Promise.all([
    listHospedajesByDestino(destino.id),
    listLugaresByDestino(destino.id, { tipo: "gastronomico" }),
    listLugaresByDestino(destino.id, { tipo: "atractivo" }),
  ]);

  const hospedajes: ArmadorItem[] = hospedajesRaw.map((h) => ({
    slug: h.slug,
    nombre: h.nombre,
    sublabel: `${TIPO_HOSPEDAJE_LABEL[h.tipo] ?? "Hospedaje"}${
      h.capacidad_max ? ` · hasta ${h.capacidad_max} personas` : ""
    }`,
    descripcion: h.descripcion_corta,
    fotoUrl: fotoUrl(h.foto_principal_path),
    whatsapp: h.whatsapp || null,
  }));

  const gastronomia: ArmadorItem[] = gastroRaw.map((l) => ({
    slug: l.slug,
    nombre: l.nombre,
    sublabel: l.categoria,
    descripcion: l.descripcion_corta,
    fotoUrl: fotoUrl(l.foto_principal_path),
    whatsapp: l.whatsapp,
  }));

  const atractivos: ArmadorItem[] = atractivosRaw.map((l) => ({
    slug: l.slug,
    nombre: l.nombre,
    sublabel: l.categoria,
    descripcion: l.descripcion_corta,
    fotoUrl: fotoUrl(l.foto_principal_path),
    whatsapp: l.whatsapp,
  }));

  // Sin inventario para combinar → no tiene sentido el armador.
  if (hospedajes.length + gastronomia.length + atractivos.length === 0) {
    redirect(`/${destinoSlug}`);
  }

  return (
    <ArmadorView
      destino={{ slug: destino.slug, nombre: destino.nombre }}
      hospedajes={hospedajes}
      gastronomia={gastronomia}
      atractivos={atractivos}
    />
  );
}
