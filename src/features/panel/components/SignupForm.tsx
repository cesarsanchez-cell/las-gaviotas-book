"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpResponsableAction } from "@/features/panel/lib/session-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Creando cuenta..." : "Crear cuenta"}
    </Button>
  );
}

export function SignupForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = React.useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await signUpResponsableAction(formData);
    if (result?.error) setError(result.error);
    if (result?.pendingConfirmation) setPendingConfirmation(true);
  }

  if (pendingConfirmation) {
    return (
      <div className="space-y-4 text-center">
        <p className="font-display text-xl">Revisá tu email</p>
        <p className="text-sm text-muted-foreground">
          Te enviamos un link de confirmación. Una vez confirmes podés ingresar
          con tu email y contraseña.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input id="nombre" name="nombre" required autoComplete="name" />
      </div>

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
