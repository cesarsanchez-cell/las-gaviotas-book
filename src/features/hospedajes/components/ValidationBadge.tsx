import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ValidationBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function ValidationBadge({ className, size = "sm" }: ValidationBadgeProps) {
  return (
    <Badge
      variant="verified"
      className={cn(
        size === "md" && "px-3 py-1 text-sm",
        className
      )}
      title="Hospedaje verificado por Las Gaviotas BOOK"
    >
      <ShieldCheck className={cn("h-3 w-3", size === "md" && "h-4 w-4")} aria-hidden />
      <span>Verificado</span>
    </Badge>
  );
}
