import type { AmenityKey } from "@/config/amenities";
import type { TipoHospedaje } from "@/types/domain";

export interface HospedajeCardMock {
  id: string;
  slug: string;
  nombre: string;
  tipo: TipoHospedaje;
  descripcion_corta: string;
  direccion: string;
  capacidad_max: number;
  amenities: AmenityKey[];
  destacado: boolean;
  foto_principal_path: string;
  foto_alt: string;
  whatsapp: string;
}

export const MOCK_DESTINO_SLUG = "las-gaviotas";

export const MOCK_HOSPEDAJES: HospedajeCardMock[] = [
  {
    id: "mock-1",
    slug: "posta-cangrejo-apart",
    nombre: "Posta Cangrejo Apart",
    tipo: "apart",
    descripcion_corta:
      "Aparts modernos a metros del mar, con parrilla y deck propio.",
    direccion: "Calle 33 entre Costanera y 1, Las Gaviotas",
    capacidad_max: 6,
    amenities: [
      "wifi",
      "playa_cerca",
      "estacionamiento",
      "parrilla",
      "patio",
      "aire_acondicionado",
      "tv",
      "cocina",
    ],
    destacado: true,
    foto_principal_path: "placeholders/apart-1.jpg",
    foto_alt: "Fachada de Posta Cangrejo Apart",
    whatsapp: "+5491155555555",
  },
  {
    id: "mock-2",
    slug: "cabanas-del-medano",
    nombre: "Cabañas del Médano",
    tipo: "cabana",
    descripcion_corta:
      "Cabañas rodeadas de pinos, ideales para descanso familiar.",
    direccion: "Av. 1 y 32, Las Gaviotas",
    capacidad_max: 5,
    amenities: [
      "wifi",
      "estacionamiento",
      "parrilla",
      "patio",
      "apto_ninos",
      "calefaccion",
    ],
    destacado: false,
    foto_principal_path: "placeholders/cabana-1.jpg",
    foto_alt: "Cabaña entre los pinos",
    whatsapp: "+5491166666666",
  },
  {
    id: "mock-3",
    slug: "hosteria-laguna",
    nombre: "Hostería Laguna",
    tipo: "hosteria",
    descripcion_corta:
      "Habitaciones cálidas con desayuno casero incluido y wifi de fibra.",
    direccion: "Calle 30 e/ 1 y 2, Las Gaviotas",
    capacidad_max: 4,
    amenities: [
      "wifi",
      "desayuno",
      "estacionamiento",
      "aire_acondicionado",
      "tv",
    ],
    destacado: false,
    foto_principal_path: "placeholders/apart-2.jpg",
    foto_alt: "Habitación de la hostería",
    whatsapp: "+5491177777777",
  },
];
