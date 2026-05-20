import { redirect } from "next/navigation";

export default function MisLugaresIndexPage() {
  // El dashboard de /panel ya muestra el listado completo de mis lugares.
  redirect("/panel");
}
