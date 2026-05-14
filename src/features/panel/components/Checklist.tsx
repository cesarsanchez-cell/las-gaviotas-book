import { CheckCircle2, Circle } from "lucide-react";
import {
  type ChecklistItem,
  checklistSummary,
} from "@/features/panel/lib/checklist";
import { cn } from "@/lib/utils";

interface ChecklistProps {
  items: ChecklistItem[];
  className?: string;
}

export function Checklist({ items, className }: ChecklistProps) {
  const { ok, total, complete } = checklistSummary(items);

  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-6",
        complete ? "border-emerald-200" : "border-border",
        className
      )}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl tracking-tight">
            Checklist para publicar
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cuando esté completo podés enviar a revisión.
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
            complete
              ? "bg-emerald-100 text-emerald-800"
              : "bg-muted text-muted-foreground"
          )}
        >
          {ok}/{total}
        </span>
      </header>

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2.5">
            {item.ok ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                aria-hidden
              />
            ) : (
              <Circle
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm",
                  item.ok
                    ? "text-foreground"
                    : "text-foreground font-medium"
                )}
              >
                {item.label}
              </p>
              {item.hint && (
                <p
                  className={cn(
                    "text-xs",
                    item.ok ? "text-muted-foreground" : "text-amber-700"
                  )}
                >
                  {item.hint}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
