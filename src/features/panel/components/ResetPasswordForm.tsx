"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/features/panel/lib/session-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Guardando..." : "Guardar contraseña"}
    </Button>
  );
}

interface ResetPasswordFormProps {
  /** A dónde redirigir cuando el password se actualice. /panel para responsables, /admin para admins. */
  next?: string;
}

export function ResetPasswordForm({ next = "/panel" }: ResetPasswordFormProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setStatus("idle");
    setMessage(null);
    const r = await resetPasswordAction(formData);
    if (r?.error) {
      setStatus("error");
      setMessage(r.error);
      return;
    }
    setStatus("ok");
    setMessage("Contraseña actualizada. Redirigiendo...");
    setTimeout(() => router.push(next), 1200);
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          Mínimo 8 caracteres.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Repetir contraseña</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      {status === "error" && message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      )}
      {status === "ok" && message && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
