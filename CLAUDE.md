# CLAUDE.md

## Proyecto
Las Gaviotas BOOK.
Portal turístico y directorio de hospedajes de Las Gaviotas, Argentina.

Objetivo inicial:
Construir una plataforma web estilo Booking.com enfocada exclusivamente en hospedajes de Las Gaviotas, con estética moderna, navegación visual y validación de alojamientos, pero SIN motor de reservas ni pagos online en la primera etapa.

La plataforma debe priorizar:

* experiencia visual,
* confianza,
* visibilidad de hospedajes,
* SEO local,
* velocidad,
* diseño mobile-first.

# Objetivos de la Etapa 1

## Funcionalidades incluidas

* Landing principal tipo Booking.
* Listado de hospedajes.
* Página individual por alojamiento.
* Galería de imágenes.
* Amenities.
* Ubicación.
* Contacto por WhatsApp.
* Validación manual de hospedajes.
* Validación del responsable.
* Panel admin simple.
* Filtros básicos.
* Diseño responsive.

## Funcionalidades NO incluidas

* Reservas online.
* Pagos.
* Calendario en tiempo real.
* Sincronización OTA.
* Channel manager.
* Cobro de comisiones.
* Login de huéspedes.

---

# Filosofía del proyecto

El sistema NO debe percibirse como:

* competencia agresiva contra los alojamientos,
* OTA tradicional,
* marketplace masivo.

Debe sentirse como:

* portal oficial/local del destino,
* catálogo premium de hospedajes,
* ecosistema turístico regional.

---

# Requisitos técnicos

## Frontend

* Next.js
* TypeScript
* TailwindCSS
* shadcn/ui

## Backend

* Supabase

Usar:

* PostgreSQL
* Auth
* Storage
* Row Level Security

---

# Requisitos de UI/UX

Inspiración visual:

* Booking.com
* Airbnb
* Despegar

Pero evitando:

* sobrecarga visual,
* demasiados banners,
* complejidad innecesaria.

Diseño:

* limpio,
* moderno,
* fotos grandes,
* foco mobile-first,
* navegación rápida.

---

# Arquitectura

## Etapa 1

Directorio visual.

## Etapa 2

Consultas y leads.

## Etapa 3

Disponibilidad simple.

## Etapa 4

Reservas online.

## Etapa 5

Pagos y comisiones.

La arquitectura debe permitir evolucionar sin reescribir completamente el sistema.

---

# Validación de alojamientos

Todo hospedaje debe tener:

* nombre real,
* dirección verificable,
* ubicación Maps,
* fotos reales,
* responsable identificado,
* WhatsApp validado.

---

# SEO

Prioridad alta:

* SEO local,
* páginas indexables,
* metadata dinámica,
* performance,
* schema.org,
* imágenes optimizadas.

---

# Reglas de desarrollo

* Código modular.
* Componentes reutilizables.
* Evitar sobreingeniería.
* Priorizar simplicidad.
* Mantener arquitectura limpia.
* Preparar escalabilidad futura.

---

# Objetivo estratégico

Concentrar la oferta turística de Las Gaviotas en una única plataforma moderna y confiable.

La prioridad inicial NO es monetización.
La prioridad es:

* inventario,
* tráfico,
* confianza,
* posicionamiento regional.