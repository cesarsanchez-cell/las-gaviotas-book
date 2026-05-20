import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import {
  listAllDestinosForSitemap,
  listAllHospedajesForSitemap,
} from "@/features/hospedajes/lib/queries";
import { listAllLugaresForSitemap } from "@/features/lugares/lib/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinos, hospedajes, lugares] = await Promise.all([
    listAllDestinosForSitemap(),
    listAllHospedajesForSitemap(),
    listAllLugaresForSitemap(),
  ]);

  const base = siteConfig.url.replace(/\/$/, "");

  const destinoUrls: MetadataRoute.Sitemap = destinos.flatMap((d) => [
    {
      url: `${base}/${d.slug}`,
      lastModified: new Date(d.updated_at),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/${d.slug}/hospedajes`,
      lastModified: new Date(d.updated_at),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/${d.slug}/gastronomia`,
      lastModified: new Date(d.updated_at),
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${base}/${d.slug}/atractivos`,
      lastModified: new Date(d.updated_at),
      changeFrequency: "weekly",
      priority: 0.75,
    },
  ]);

  const hospedajeUrls: MetadataRoute.Sitemap = hospedajes.map((h) => ({
    url: `${base}/${h.destino_slug}/hospedajes/${h.slug}`,
    lastModified: new Date(h.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const lugarUrls: MetadataRoute.Sitemap = lugares.map((l) => ({
    url: `${base}/${l.destino_slug}/${l.tipo === "gastronomico" ? "gastronomia" : "atractivos"}/${l.slug}`,
    lastModified: new Date(l.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...destinoUrls, ...hospedajeUrls, ...lugarUrls];
}
