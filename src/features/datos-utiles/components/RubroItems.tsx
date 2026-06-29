"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Rubro, DatoUtil } from "@/lib/types";

interface RubroItemsProps {
  rubro: Rubro;
  items: DatoUtil[];
  onDelete: (id: string) => void;
}

export function RubroItems({ rubro, items, onDelete }: RubroItemsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-base">{item.nombre}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {item.direccion && (
              <div className="text-sm">
                <div className="font-medium text-muted-foreground">
                  Dirección
                </div>
                <div>{item.direccion}</div>
              </div>
            )}
            {item.contacto && (
              <div className="text-sm">
                <div className="font-medium text-muted-foreground">
                  Contacto
                </div>
                <div>{item.contacto}</div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
