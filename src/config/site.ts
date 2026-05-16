export const siteConfig = {
  /**
   * Marca paraguas de toda la red.
   * Cada destino (Las Gaviotas, Tandil, etc.) es una comunidad propia que
   * se presenta como "Mis Escapadas a {Destino}", con peso visual equivalente.
   */
  name: "Mis Escapadas",
  shortName: "Mis Escapadas",
  description:
    "Red de portales turísticos locales. Hospedajes verificados por la comunidad de cada destino — empezando por Las Gaviotas, Partido de la Costa, Argentina.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "es-AR",
  country: "AR",
  keywords: [
    "Mis Escapadas",
    "Las Gaviotas",
    "alojamiento Las Gaviotas",
    "hospedajes Las Gaviotas",
    "cabañas Las Gaviotas",
    "Partido de la Costa",
    "turismo costa atlántica argentina",
  ],
  /**
   * Destino que se muestra al entrar al raíz mientras no haya hub multi-destino.
   * Cuando `/` se transforme en selector de destinos, este campo deja de usarse
   * para redirigir y pasa a ser solo referencia interna.
   */
  defaultDestino: "las-gaviotas",
  contact: {
    whatsapp: "",
    email: "",
  },
  social: {
    instagram: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
