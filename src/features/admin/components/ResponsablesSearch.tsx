"use client";

import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { searchResponsablesByNameOrComercio } from "@/features/admin/lib/responsable-management";

interface SearchResult {
  id: string;
  nombre: string | null;
  email: string;
  matchType: "responsable" | "comercio";
  matchedComercio?: { id: string; nombre: string; tipo: string };
}

interface Props {
  onClose?: () => void;
}

export function ResponsablesSearch({ onClose }: Props = {}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pending, startTransition] = useTransition();

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);

    if (value.length === 0) {
      setResults([]);
      return;
    }

    startTransition(async () => {
      const res = await searchResponsablesByNameOrComercio(value);
      setResults(res);
    });
  }

  return (
    <div className="relative mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por responsable o comercio..."
          value={query}
          onChange={handleInputChange}
          className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-10 text-sm transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-border bg-card shadow-lg z-10">
          <div className="max-h-96 overflow-y-auto">
            {results.map((result) => (
              <a
                key={`${result.id}-${result.matchType}`}
                href={`/admin/responsables/${result.id}`}
                onClick={onClose && (() => onClose())}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 last:border-0 hover:bg-muted/40 transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {result.nombre || result.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.matchType === "responsable"
                      ? result.email
                      : `Comercio: ${result.matchedComercio?.nombre}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    result.matchType === "responsable"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {result.matchType === "responsable"
                    ? "Responsable"
                    : "Por comercio"}
                </span>
              </a>
            ))}
          </div>
          {pending && (
            <div className="px-4 py-3 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          )}
        </div>
      )}

      {query && results.length === 0 && !pending && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          No se encontraron resultados.
        </div>
      )}
    </div>
  );
}
