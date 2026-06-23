import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";

export default async function NuevoHospedajePage() {
  await requireAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <Link
          href="/admin/hospedajes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a hospedajes
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          Nuevo hospedaje
        </h1>
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="flex gap-4">
          <Info className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-3">
            <p className="font-medium text-amber-900">
              El responsable debe crear el hospedaje directamente
            </p>
            <p className="text-sm text-amber-800">
              Los datos de un hospedaje (fotos, descripción, detalles exactos) solo los tiene el dueño/operador del comercio.
              El flujo es:
            </p>
            <ol className="space-y-2 text-sm text-amber-800 list-decimal list-inside">
              <li>El responsable hace login en <code className="bg-amber-100 px-1 rounded text-xs">/login</code></li>
              <li>Va a <code className="bg-amber-100 px-1 rounded text-xs">/panel/hospedajes/nuevo</code> y carga sus datos</li>
              <li>Vos lo validás desde <code className="bg-amber-100 px-1 rounded text-xs">/admin/validaciones</code></li>
              <li>Aprobás y se publica</li>
            </ol>
            <p className="text-sm text-amber-800 pt-2">
              <strong>Si también sos responsable de un hospedaje:</strong> accedé a <code className="bg-amber-100 px-1 rounded text-xs">/panel</code> con tu rol de responsable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
