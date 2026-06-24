import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hospedajeInvitacionTemplate } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/resend";
import { siteConfig } from "@/config/site";

export async function POST(request: NextRequest) {
  const { hospedajeId } = await request.json();

  if (!hospedajeId) {
    return NextResponse.json(
      { error: "hospedajeId requerido" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Cargar hospedaje
  const result = await supabase
    .from("hospedajes")
    .select("id, nombre, destino_id, responsable_email, responsable_whatsapp")
    .eq("id", hospedajeId)
    .maybeSingle();

  const hospedaje = result.data as {
    id: string;
    nombre: string;
    destino_id: string;
    responsable_email: string | null;
    responsable_whatsapp: string | null;
  } | null;

  if (!hospedaje) {
    return NextResponse.json(
      { error: "Hospedaje no encontrado" },
      { status: 404 }
    );
  }

  if (!hospedaje.responsable_email) {
    return NextResponse.json(
      { error: "Hospedaje sin email responsable" },
      { status: 400 }
    );
  }

  // Cargar destino
  const destinoResult = await supabase
    .from("destinos")
    .select("slug")
    .eq("id", hospedaje.destino_id)
    .maybeSingle();

  const destino = destinoResult.data as { slug: string } | null;

  // Generar URL de onboarding
  const urlPanel = `${siteConfig.url}/onboarding/hospedajes/${hospedaje.id}`;

  // Generar template del email
  const { subject, html } = hospedajeInvitacionTemplate({
    hospedajeNombre: hospedaje.nombre,
    destinoNombre: destino?.slug ?? "Mis Escapadas",
    urlPanel,
  });

  // Enviar email
  const emailResult = await sendEmail({
    from: "Mis Escapadas <invitaciones@misescapadas.com.ar>",
    to: hospedaje.responsable_email,
    subject,
    html,
  });

  if (!emailResult.ok) {
    console.error("❌ Error al enviar email:", emailResult.error);
    return NextResponse.json(
      { error: "Error al enviar email", details: emailResult.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Email enviado a ${hospedaje.responsable_email}`,
    emailId: emailResult.id,
    hospedajeName: hospedaje.nombre,
    onboardingUrl: urlPanel,
  });
}
