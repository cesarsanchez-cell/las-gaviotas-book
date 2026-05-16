import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/features/admin/lib/auth";
import { sendEmail } from "@/lib/email/resend";

/**
 * Endpoint de diagnóstico: prueba el envío de mail vía Resend y devuelve
 * el detalle (env var presente, response de Resend, error si lo hubo).
 *
 * USO: GET /api/debug-email?to=tu@email.com
 *
 * Requiere estar logueado como admin (cookie de sesión activa de /admin/login).
 *
 * TODO: borrar este archivo una vez confirmado que los mails funcionan.
 */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        error: "No hay sesión admin activa. Logueate en /admin/login primero.",
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const to = url.searchParams.get("to") ?? admin.email;
  if (!to) {
    return NextResponse.json(
      { error: "Pasá ?to=email@ejemplo.com en la query" },
      { status: 400 }
    );
  }

  const apiKeyPresent = !!process.env.RESEND_API_KEY;
  const apiKeyPrefix = process.env.RESEND_API_KEY?.slice(0, 6) ?? null;
  const apiKeyLength = process.env.RESEND_API_KEY?.length ?? 0;

  let sendResult;
  try {
    sendResult = await sendEmail({
      to,
      subject: "Test de envío desde Mis Escapadas",
      html: "<h2>Funciona</h2><p>Este mail confirma que el pipeline app → Resend está OK.</p>",
    });
  } catch (e) {
    sendResult = {
      ok: false as const,
      error:
        e instanceof Error ? `EXCEPTION: ${e.message}` : "Unknown exception",
    };
  }

  return NextResponse.json({
    adminEmail: admin.email,
    apiKeyPresent,
    apiKeyPrefix,
    apiKeyLength,
    to,
    result: sendResult,
  });
}
