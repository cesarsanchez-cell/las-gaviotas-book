import { listRubros, listDatosUtilesByDestino } from "../lib/queries";
import { DatosUtilesButton } from "./DatosUtilesButton";

interface DatosUtilesButtonServerProps {
  destinoId: string;
}

export async function DatosUtilesButtonServer({
  destinoId,
}: DatosUtilesButtonServerProps) {
  const [rubros, datosUtiles] = await Promise.all([
    listRubros(),
    listDatosUtilesByDestino(destinoId),
  ]);

  return <DatosUtilesButton rubros={rubros} datosUtiles={datosUtiles} />;
}
