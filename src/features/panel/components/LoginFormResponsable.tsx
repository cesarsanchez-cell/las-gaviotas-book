"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInResponsableAction } from "@/features/panel/lib/session-actions";

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

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await signInResponsableAction(formData);
    if (result?.error) setError(result.error);
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
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
