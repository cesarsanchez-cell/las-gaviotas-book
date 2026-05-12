import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  whatsapp: string;
  hospedajeNombre?: string;
  mensaje?: string;
  size?: "sm" | "default" | "lg";
  fullWidth?: boolean;
  label?: string;
  className?: string;
}

export function WhatsAppButton({
  whatsapp,
  hospedajeNombre,
  mensaje,
  size = "default",
  fullWidth,
  label = "Consultar por WhatsApp",
  className,
}: WhatsAppButtonProps) {
  const href = buildWhatsAppUrl({ whatsapp, hospedajeNombre, mensaje });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir WhatsApp para consultar${
        hospedajeNombre ? ` ${hospedajeNombre}` : ""
      }`}
      className={cn(
        buttonVariants({ variant: "whatsapp", size }),
        fullWidth && "w-full",
        className
      )}
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </a>
  );
}
