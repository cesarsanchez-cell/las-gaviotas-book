export type {
  Hospedaje,
  HospedajeFoto,
  HospedajeListItem,
  TipoHospedaje,
  EstadoHospedaje,
} from "@/types/domain";

export const TIPO_HOSPEDAJE_LABEL: Record<
  import("@/types/domain").TipoHospedaje,
  string
> = {
  hotel: "Hotel",
  apart: "Apart",
  cabana: "Cabaña",
  hosteria: "Hostería",
  camping: "Camping",
  casa: "Casa",
  departamento: "Departamento",
};
