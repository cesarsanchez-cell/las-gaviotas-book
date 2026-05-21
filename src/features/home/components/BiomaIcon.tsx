import {
  Waves,
  Trees,
  Mountain,
  MountainSnow,
  Sailboat,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { Bioma } from "@/types/database";

const ICON_BY_BIOMA: Record<Bioma, LucideIcon> = {
  playa: Waves,
  bosque: Trees,
  montana: Mountain,
  sierra: MountainSnow,
  lago: Sailboat,
  desierto: Sun,
};

const LABEL_BY_BIOMA: Record<Bioma, string> = {
  playa: "Playa",
  bosque: "Bosque",
  montana: "Montaña",
  sierra: "Sierra",
  lago: "Lago",
  desierto: "Desierto",
};

const COLOR_VAR_BY_BIOMA: Record<Bioma, string> = {
  playa: "hsl(var(--bioma-playa))",
  bosque: "hsl(var(--bioma-bosque))",
  montana: "hsl(var(--bioma-montana))",
  sierra: "hsl(var(--bioma-sierra))",
  lago: "hsl(var(--bioma-lago))",
  desierto: "hsl(var(--bioma-desierto))",
};

export function biomaIcon(b: Bioma): LucideIcon {
  return ICON_BY_BIOMA[b];
}
export function biomaLabel(b: Bioma): string {
  return LABEL_BY_BIOMA[b];
}
export function biomaColor(b: Bioma): string {
  return COLOR_VAR_BY_BIOMA[b];
}

interface BiomaIconProps {
  bioma: Bioma;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function BiomaIcon({
  bioma,
  size = 16,
  strokeWidth = 2,
  className,
}: BiomaIconProps) {
  const Icon = ICON_BY_BIOMA[bioma];
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
}
