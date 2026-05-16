/**
 * Helper para enviar emails transaccionales via Resend API (HTTP, sin SDK).
 *
 * Requiere la env var `RESEND_API_KEY` con un API key que tenga "Sending
 * access". Si la var no está seteada (entornos donde aún no se configuró,
 * tests locales sin SMTP, etc.) loguea un warning y no tira error.
 *
 * Nota: el SMTP de Supabase Auth usa la MISMA API key. Esta helper es para
 * mails de aplicación (notificaciones de validación, leads en el futuro,
 * etc.) que no son parte del flow de Auth.
 */

const RESEND_API = "https://api.resend.com/emails";
const FROM_DEFAULT = "Mis Escapadas <noreply@misescapadas.com.ar>";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[email/resend] RESEND_API_KEY no seteada. Skipping email a",
      params.to
    );
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from ?? FROM_DEFAULT,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[email/resend] HTTP", res.status, text);
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }

    const data = (await res.json()) as { id: string };
    return { ok: true, id: data.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[email/resend] Network error:", msg);
    return { ok: false, error: msg };
  }
}
