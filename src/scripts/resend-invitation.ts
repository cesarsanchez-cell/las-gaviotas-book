import { createAdminClient } from "@/lib/supabase/admin";
import { hospedajeInvitacionTemplate } from "@/lib/email/templates";
import { Resend } from "resend";
import { siteConfig } from "@/config/site";

const resend = new Resend(process.env.RESEND_API_KEY);

async function resendInvitation(hospedajeId: string) {
  const supabase = createAdminClient();

  // Cargar hospedaje
  const { data: hospedaje } = await supabase
    .from("hospedajes")
    .select("id, nombre, destino_id, responsable_email, responsable_whatsapp")
    .eq("id", hospedajeId)
    .single();

  if (!hospedaje) {
    console.error("❌ Hospedaje no encontrado");
    return;
  }

  // Cargar destino
  const { data: destino } = await supabase
    .from("destinos")
    .select("slug")
    .eq("id", hospedaje.destino_id)
    .single();

  if (!hospedaje.responsable_email) {
    console.error("❌ Hospedaje sin email responsable");
    return;
  }

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
  } else {
    console.log("✅ Email enviado a:", hospedaje.responsable_email);
    console.log("📧 ID de email:", result.data?.id);
    console.log("🔗 Link de onboarding:", urlPanel);
  }
}

// Ejecutar
const hospedajeId = process.argv[2] || "066f4eff-1476-450c-9245-bab554924a6e";
resendInvitation(hospedajeId).catch(console.error);
