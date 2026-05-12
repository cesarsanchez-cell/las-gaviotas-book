export const siteConfig = {
  name: "Las Gaviotas BOOK",
  shortName: "Las Gaviotas BOOK",
  description:
    "Directorio premium de hospedajes en Las Gaviotas, Partido de la Costa, Argentina. Cabañas, aparts, hosterías y casas verificadas.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "es-AR",
  country: "AR",
  keywords: [
    "Las Gaviotas",
    "alojamiento Las Gaviotas",
    "hospedajes Las Gaviotas",
    "cabañas Las Gaviotas",
    "Partido de la Costa",
    "turismo costa atlántica argentina",
  ],
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
