import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardingForm } from "./components/onboarding-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OnboardingPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Cargar hospedaje sin requerir autenticación
  const result = await supabase
    .from("hospedajes")
    .select("id, nombre, destino_id, responsable_email, responsable_whatsapp")
    .eq("id", id)
    .eq("estado", "borrador")
    .maybeSingle();

  const hospedaje = result.data as {
    id: string;
    nombre: string;
    destino_id: string;
    responsable_email: string | null;
    responsable_whatsapp: string | null;
  } | null;
  const error = result.error;

  if (error || !hospedaje) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <h1 className="font-display text-3xl tracking-tight">
            Completa tu hospedaje
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crearemos tu cuenta y completaremos los datos del hospedaje &quot;{hospedaje.nombre}&quot;.
          </p>

          <OnboardingForm
            hospedajeId={hospedaje.id}
            hospedajeNombre={hospedaje.nombre}
            prefilledEmail={hospedaje.responsable_email || ""}
            prefilledWhatsapp={hospedaje.responsable_whatsapp || ""}
          />
        </div>
      </div>
    </div>
  );
}
