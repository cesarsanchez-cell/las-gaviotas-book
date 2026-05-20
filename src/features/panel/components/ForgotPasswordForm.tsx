"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/features/panel/lib/session-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Enviando..." : "Enviarme el link"}
    </Button>
  );
}

interface ForgotPasswordFormProps {
  /** Define a qué login redirigir al usuario después del reset. */
  context?: "admin" | "responsable";
}

export function ForgotPasswordForm({
  context = "responsable",
}: ForgotPasswordFormProps = {}) {
  const [status, setStatus] = React.useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setStatus("idle");
    setMessage(null);
    const r = await forgotPasswordAction(formData);
    if (r?.error) {
      setStatus("error");
      setMessage(r.error);
    } else {
      setStatus("ok");
      setMessage(
        "Listo. Si la dirección está registrada, te llega un mail con el link para definir un nuevo password. Revisá tu casilla y spam."
      );
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-md bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        {message}
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <input type="hidden" name="context" value={context} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
        />
        <p className="text-xs text-muted-foreground">
          Te enviamos un link a tu casilla para definir un password nuevo.
        </p>
      </div>

      {status === "error" && message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
