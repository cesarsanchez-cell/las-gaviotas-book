import type { HeroSlide, HeroSlideType } from "@/features/destinos/components/HeroCarousel";
import type { AtraccionHero, VerticalItem, VerticalKey } from "./queries";

// kind de la vertical → tipo de slide del hero (1:1 con el segmento de ruta).
const KIND_TO_TYPE: Record<VerticalKey, HeroSlideType> = {
  hospedajes: "hospedaje",
  gastronomia: "gastronomia",
  atractivos: "atractivo",
};

function toSlide(it: VerticalItem): HeroSlide | null {
  if (!it.fotoUrl) return null; // el hero necesita foto sí o sí
  return {
    type: KIND_TO_TYPE[it.kind],
    slug: it.slug,
    nombre: it.nombre,
    categoria: it.tipoLabel,
    descripcion: it.descripcionCorta,
    photoUrl: it.fotoUrl,
    href: `/${it.destino.slug}/${it.kind}/${it.slug}`,
  };
}

/**
 * Arma hasta `max` slides para el hero mezclando las tres verticales en orden
 * intercalado (atractivo → hospedaje → gastronomía), priorizando los destacados.
 * Solo entran items con foto. Sirve tanto a la home (data de red) como a la
 * página de destino (data scopeada).
 */
export function buildHeroSlides(
  verticalData: Record<VerticalKey, VerticalItem[]>,
  max = 6
): HeroSlide[] {
  // Orden de prioridad de verticales para el intercalado.
  const orden: VerticalKey[] = ["atractivos", "hospedajes", "gastronomia"];

  // Por vertical: destacados primero, luego el resto (ya vienen ordenados así
  // desde la query, pero lo aseguramos).
  const colas = new Map<VerticalKey, VerticalItem[]>();
  for (const k of orden) {
    const items = [...(verticalData[k] ?? [])].sort(
      (a, b) => Number(b.destacado) - Number(a.destacado)
    );
    colas.set(k, items);
  }

  const slides: HeroSlide[] = [];
  const seen = new Set<string>();
  let progreso = true;
  while (slides.length < max && progreso) {
    progreso = false;
    for (const k of orden) {
      if (slides.length >= max) break;
      const cola = colas.get(k)!;
      const it = cola.shift();
      if (!it) continue;
      progreso = true;
      const slide = toSlide(it);
      if (!slide) continue;
      const key = `${slide.type}:${slide.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      slides.push(slide);
    }
  }
  return slides;
}

/**
 * Hero emocional a partir de atracciones curadas (lo que tracciona gente: playa,
 * bosque, eventos). Solo entran las que tienen foto. Ya vienen ordenadas
 * (destacadas → orden) y filtradas por vigencia desde la query. La card linkea a
 * la landing pública de su zona; sin zona resoluble queda editorial (no navega).
 */
export function buildAtraccionHeroSlides(
  atracciones: AtraccionHero[],
  max = 8
): HeroSlide[] {
  const slides: HeroSlide[] = [];
  for (const a of atracciones) {
    if (!a.fotoUrl) continue; // el hero necesita foto sí o sí
    slides.push({
      type: "atraccion",
      slug: a.slug,
      nombre: a.nombre,
      categoria: a.categoria ?? "",
      descripcion: a.descripcion,
      photoUrl: a.fotoUrl,
      href: a.zonaSlug ? `/zona/${a.zonaSlug}` : undefined,
    });
    if (slides.length >= max) break;
  }
  return slides;
}
