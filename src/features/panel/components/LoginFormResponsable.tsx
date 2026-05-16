"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resendConfirmationAction,
  signInResponsableAction,
} from "@/features/panel/lib/session-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Ingresando..." : "Ingresar"}
    </Button>
  );
}

interface LoginFormResponsableProps {
  next?: string;
}

export function LoginFormResponsable({ next }: LoginFormResponsableProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false);
  const [pendingEmail, setPendingEmail] = React.useState<string | null>(null);
  const [resendStatus, setResendStatus] = React.useState<
    "idle" | "pending" | "ok" | "error"
  >("idle");
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setNeedsConfirmation(false);
    setPendingEmail(null);
    setResendStatus("idle");
    setResendMessage(null);

    const result = await signInResponsableAction(formData);
    if (result?.error) setError(result.error);
    if (result?.needsConfirmation && result.email) {
      setNeedsConfirmation(true);
      setPendingEmail(result.email);
    }
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setResendStatus("pending");
    setResendMessage(null);
    const result = await resendConfirmationAction(pendingEmail);
    if (result?.error) {
      setResendStatus("error");
      setResendMessage(result.error);
    } else {
      setResendStatus("ok");
      setResendMessage(
        `Te reenviamos el email a ${pendingEmail}. Revisá tu casilla y spam.`
      );
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <input type="hidden" name="next" value={next ?? "/panel"} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="space-y-2">
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
          {needsConfirmation && pendingEmail && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
              <p className="mb-2 text-amber-900">
                ¿No te llegó? Podemos reenviarte el email de confirmación.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={resendStatus === "pending" || resendStatus === "ok"}
              >
                {resendStatus === "pending"
                  ? "Reenviando..."
                  : resendStatus === "ok"
                    ? "Email reenviado ✓"
                    : "Reenviar email de confirmación"}
              </Button>
              {resendMessage && (
                <p
                  className={`mt-2 text-xs ${
                    resendStatus === "ok"
                      ? "text-emerald-700"
                      : "text-destructive"
                  }`}
                >
                  {resendMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
