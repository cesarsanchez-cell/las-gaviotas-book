"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminSetupForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = await createClient();

      // Actualizar contraseña
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });

      if (updateErr) {
        setError(updateErr.message);
        setLoading(false);
        return;
      }

      // Auto-login ya está hecho (sesión PKCE activa)
      // Redirigir al panel
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm font-medium" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          minLength={6}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">Mínimo 6 caracteres</p>
      </div>

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Creando contraseña…" : "Crear contraseña e ingresar"}
      </button>
    </form>
  );
}
