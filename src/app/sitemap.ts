import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import {
  listAllDestinosForSitemap,
  listAllHospedajesForSitemap,
} from "@/features/hospedajes/lib/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinos, hospedajes] = await Promise.all([
    listAllDestinosForSitemap(),
    listAllHospedajesForSitemap(),
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
  ]);

  const hospedajeUrls: MetadataRoute.Sitemap = hospedajes.map((h) => ({
    url: `${base}/${h.destino_slug}/hospedajes/${h.slug}`,
    lastModified: new Date(h.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...destinoUrls, ...hospedajeUrls];
}
