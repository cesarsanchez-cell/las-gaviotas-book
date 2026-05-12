import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: "sm" | "md" | "lg" | "xl";
  tone?: "default" | "muted" | "sand";
}

const spacingMap: Record<NonNullable<SectionProps["spacing"]>, string> = {
  sm: "py-8 md:py-10",
  md: "py-12 md:py-16",
  lg: "py-16 md:py-24",
  xl: "py-20 md:py-32",
};

const toneMap: Record<NonNullable<SectionProps["tone"]>, string> = {
  default: "bg-background",
  muted: "bg-muted",
  sand: "bg-sand-50",
};

export function Section({
  className,
  spacing = "lg",
  tone = "default",
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(spacingMap[spacing], toneMap[tone], className)}
      {...props}
    />
  );
}
