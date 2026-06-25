"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/label";
import { signUpAdminAction } from "@/features/panel/lib/session-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Creando cuenta..." : "Crear cuenta"}
    </Button>
  );
}

interface AdminSignupFormProps {
  initialEmail?: string;
  initialNombre?: string;
  destinoId?: string;
}

export function AdminSignupForm({ initialEmail = "", initialNombre = "", destinoId = "" }: AdminSignupFormProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = React.useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPendingConfirmation(false);
    const result = await signUpAdminAction(formData);
    if (result?.error) setError(result.error);
    if (result?.pendingConfirmation) setPendingConfirmation(true);
  }

  if (pendingConfirmation) {
    return (
      <div className="space-y-5 rounded-md bg-blue-50 px-4 py-5 text-center">
        <p className="text-sm font-medium text-blue-900">
          ¡Cuenta creada! 🎉
        </p>
        <p className="text-sm text-blue-700">
          Te enviamos un link de confirmación a <strong>{initialEmail}</strong>. Abrilo para confirmar tu email y acceder al panel.
        </p>
        <p className="text-xs text-blue-600">
          Si no lo ves, revisa spam.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {destinoId && <input type="hidden" name="destino_id" value={destinoId} />}
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input
          id="nombre"
          name="nombre"
          required
          autoComplete="name"
          defaultValue={initialNombre}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={initialEmail}
          readOnly
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <PasswordInput
          id="password"
          name="password"
          required
          autoComplete="new-password"
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
