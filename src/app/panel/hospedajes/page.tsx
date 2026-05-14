import { redirect } from "next/navigation";

export default function HospedajesIndexPage() {
  // Por ahora redirigir al dashboard que ya muestra la lista.
  redirect("/panel");
}
