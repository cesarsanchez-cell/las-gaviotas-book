import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/admin/lib/auth";
import { sendEmail } from "@/lib/email/resend";

/**
 * Endpoint de diagnóstico: prueba el envío de mail vía Resend y devuelve
 * el detalle (env var presente, response de Resend, error si lo hubo).
 * Protegido por requireAdmin — solo accesible para vos.
 *
 * USO: GET /api/debug-email?to=tu@email.com
 *
 * TODO: borrar este archivo una vez confirmado que los mails funcionan.
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const url = new URL(request.url);
    const to = url.searchParams.get("to") ?? admin.email ?? "";

    if (!to) {
      return NextResponse.json(
        { error: "Pasá ?to=email@ejemplo.com en la query" },
        { status: 400 }
      );
    }

    const apiKeyPresent = !!process.env.RESEND_API_KEY;
    const apiKeyPrefix = process.env.RESEND_API_KEY?.slice(0, 6) ?? null;

    const result = await sendEmail({
      to,
      subject: "Test de envío desde Mis Escapadas",
      html: "<h2>Funciona</h2><p>Este mail confirma que el pipeline app → Resend está OK.</p>",
    });

    return NextResponse.json({
      apiKeyPresent,
      apiKeyPrefix,
      to,
      result,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown" },
      { status: 500 }
    );
  }
}
