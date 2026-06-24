import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hospedajeInvitacionTemplate } from "@/lib/email/templates";
import { Resend } from "resend";
import { siteConfig } from "@/config/site";

const resend = new Resend(process.env.RESEND_API_KEY);

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
  const { data: hospedaje } = await supabase
    .from("hospedajes")
    .select("id, nombre, destino_id, responsable_email, responsable_whatsapp")
    .eq("id", hospedajeId)
    .single();

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
  const { data: destino } = await supabase
    .from("destinos")
    .select("slug")
    .eq("id", hospedaje.destino_id)
    .single();

  // Generar URL de onboarding
  const urlPanel = `${siteConfig.url}/onboarding/hospedajes/${hospedaje.id}`;

  // Generar template del email
  const tpl = hospedajeInvitacionTemplate({
    hospedajeNombre: hospedaje.nombre,
    destinoNombre: destino?.slug ?? "Mis Escapadas",
    urlPanel,
  });

  // Enviar email
  const result = await resend.emails.send({
    from: "Mis Escapadas <invitaciones@misescapadas.com.ar>",
    to: hospedaje.responsable_email,
    subject: `Completa tu hospedaje: ${hospedaje.nombre}`,
    html: tpl,
  });

  if (result.error) {
    console.error("❌ Error al enviar email:", result.error);
    return NextResponse.json(
      { error: "Error al enviar email", details: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Email enviado a ${hospedaje.responsable_email}`,
    emailId: result.data?.id,
    hospedajeName: hospedaje.nombre,
    onboardingUrl: urlPanel,
  });
}
