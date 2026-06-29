"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Phone,
  ExternalLink,
  Plus,
  AlertTriangle,
  Car,
  UtensilsCrossed,
  Music,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Rubro, DatoUtil } from "@/lib/types";

function getMapsUrl(nombre: string, direccion?: string | null): string {
  const query = direccion ? `${nombre} ${direccion}` : nombre;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function getIconComponent(iconName: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    plus: Plus,
    "alert-triangle": AlertTriangle,
    car: Car,
    utensils: UtensilsCrossed,
    music: Music,
    "map-pin": MapPin,
  };
  return iconMap[iconName] || MapPin;
}

interface RubrosCarouselProps {
  rubros: Rubro[];
  onSelectRubro: (rubroId: string) => void;
}

function RubrosCarousel({ rubros, onSelectRubro }: RubrosCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {rubros.map((rubro) => {
          const Icon = getIconComponent(rubro.icono_default);
          return (
            <button
              key={rubro.id}
              onClick={() => onSelectRubro(rubro.id)}
              className="flex flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-border p-3 w-[100px] transition hover:bg-secondary hover:border-primary"
            >
              <Icon className="h-6 w-6 text-primary" />
              <div className="text-center">
                <h3 className="font-bold text-xs line-clamp-2">{rubro.nombre}</h3>
              </div>
            </button>
          );
        })}
      </div>

      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-background/90 rounded-r-lg p-2 hover:bg-secondary transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-background/90 rounded-l-lg p-2 hover:bg-secondary transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

interface ItemsCarouselProps {
  items: DatoUtil[];
  getMapsUrl: (nombre: string, direccion?: string | null) => string;
}

function ItemsCarousel({ items, getMapsUrl }: ItemsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {items.map((item) => (
          <Card
            key={item.id}
            className="p-4 border-l-4 border-l-primary flex flex-shrink-0 flex-col w-[280px]"
          >
            <h4 className="font-bold text-base mb-3">{item.nombre}</h4>
            {item.direccion && (
              <div className="mb-3">
                <a
                  href={getMapsUrl(item.nombre, item.direccion)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-2 items-start text-sm text-primary hover:underline font-medium"
                >
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{item.direccion}</span>
                  <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
                </a>
              </div>
            )}
            {item.contacto && (
              <div className="flex gap-2 items-start text-sm text-muted-foreground">
                <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{item.contacto}</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-background/90 rounded-r-lg p-2 hover:bg-secondary transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-background/90 rounded-l-lg p-2 hover:bg-secondary transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

interface DatosUtilesModalContentProps {
  rubros: Rubro[];
  datosUtiles: DatoUtil[];
}

export function DatosUtilesModalContent({
  rubros,
  datosUtiles,
}: DatosUtilesModalContentProps) {
  const [selectedRubroId, setSelectedRubroId] = useState<string | null>(null);

  const selectedRubro = rubros.find((r) => r.id === selectedRubroId);
  const rubroItems = datosUtiles.filter((d) => d.rubro_id === selectedRubroId);

  return (
    <div className="p-6">
      {selectedRubroId && selectedRubro ? (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedRubroId(null)}
            className="flex items-center gap-2 text-base text-primary hover:underline font-medium"
          >
            <ChevronLeft className="h-5 w-5" />
            Volver
          </button>

          <div>
            <h3 className="text-2xl font-bold mb-2">{selectedRubro.nombre}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedRubro.descripcion}
            </p>
          </div>

          {rubroItems.length === 0 ? (
            <p className="text-base text-muted-foreground py-8 text-center">
              Sin datos cargados aún en {selectedRubro.nombre}
            </p>
          ) : (
            <ItemsCarousel items={rubroItems} getMapsUrl={getMapsUrl} />
          )}
        </div>
      ) : (
        <RubrosCarousel
          rubros={rubros}
          onSelectRubro={setSelectedRubroId}
        />
      )}
    </div>
  );
}
