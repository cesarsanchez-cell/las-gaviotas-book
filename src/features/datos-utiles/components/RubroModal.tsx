"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, MapPin, Phone } from "lucide-react";
import type { Rubro, DatoUtil } from "@/lib/types";

interface RubroModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rubro: Rubro;
  items: DatoUtil[];
  onBack: () => void;
}

export function RubroModal({
  isOpen,
  onOpenChange,
  rubro,
  items,
  onBack,
}: RubroModalProps) {
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(onBack, 150);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-2 w-fit"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Volver
          </Button>
          <DialogTitle>{rubro.nombre}</DialogTitle>
          <DialogDescription>{rubro.descripcion}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <h4 className="font-semibold text-sm mb-2">{item.nombre}</h4>
              {item.direccion && (
                <div className="flex gap-2 items-start text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{item.direccion}</span>
                </div>
              )}
              {item.contacto && (
                <div className="flex gap-2 items-start text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{item.contacto}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
