# Capacitación: Admin Local — Las Gaviotas

**Documento interno de capacitación**  
**Fecha:** 2026-06-29  
**Destino:** Las Gaviotas  
**Rol:** Administrador Local

---

## Índice

1. [Introducción](#introducción)
2. [Tu rol como Admin Local](#tu-rol-como-admin-local)
3. [Jerarquía y permisos](#jerarquía-y-permisos)
4. [Acceso y login](#acceso-y-login)
5. [Dashboard principal](#dashboard-principal)
6. [Gestión de hospedajes](#gestión-de-hospedajes)
7. [Gestión de gastronomía](#gestión-de-gastronomía)
8. [Datos útiles](#datos-útiles)
9. [Promos y combos](#promos-y-combos)
10. [Consultas y leads](#consultas-y-leads)
11. [Responsables](#responsables)
12. [Mejores prácticas](#mejores-prácticas)
13. [Soporte](#soporte)

---

## Introducción

Bienvenido al panel de administración de **Las Gaviotas** en **Mis Escapadas**.

Eres el **Admin Local** de tu destino. Tu responsabilidad es:

- ✅ Validar y publicar hospedajes y lugares gastronómicos
- ✅ Gestionar servicios útiles (Datos Útiles)
- ✅ Crear promos y combos
- ✅ Responder consultas de viajeros
- ✅ Supervisar a responsables (dueños de hospedajes, cocineros, etc.)
- ✅ Mantener la calidad y visibilidad de Las Gaviotas en la plataforma

**Objetivo final:** Que Las Gaviotas sea el destino más buscado y confiable en Mis Escapadas.

---

## Tu rol como Admin Local

### ¿Qué haces?

| Tarea | Quién lo hace | Responsabilidad |
|-------|---------------|-----------------|
| **Invitar responsables** | Tú (Admin) | Nombre, email, WhatsApp |
| **Llenar datos comerciales** | Responsable | El dueño del hospedaje/local completa |
| **Validar hospedajes** | Tú (Admin) | Verificar que sea real, datos correctos |
| **Publicar en web** | Tú (Admin) | Decidir qué se ve en misescapadas.com.ar |
| **Gestionar fotos** | Responsable | El dueño sube fotos, tú validas |
| **Crear promos** | Tú (Admin) | Armar ofertas especiales |
| **Responder consultas** | Responsable | El viajero pregunta, responsable responde |
| **Datos útiles** | Tú (Admin) | Teléfonos de farmacia, transporte, etc. |

### Alcance de permisos

**PUEDES hacer:**
- ✅ Ver todos los hospedajes de Las Gaviotas
- ✅ Invitar responsables
- ✅ Validar y publicar hospedajes
- ✅ Crear/editar promos y combos
- ✅ Gestionar datos útiles
- ✅ Ver consultas de viajeros
- ✅ Administrar otros admins (si eres Super Admin)

**NO puedes hacer:**
- ❌ Editar disponibilidad (eso lo hace el responsable)
- ❌ Editar tarifas (eso lo hace el responsable)
- ❌ Ver emails de viajeros (privacidad)
- ❌ Borrar datos (solo el Super Admin)

---

## Jerarquía y permisos

```
Super Admin (Mis Escapadas)
    ↓
Admin Local (Tú) — Las Gaviotas
    ↓
Responsables (Dueños de hospedajes, gastronómicos)
    ↓
Viajeros (Visitantes del sitio)
```

### Super Admin vs Admin Local

| Acción | Super Admin | Admin Local |
|--------|-------------|------------|
| Gestionar destinos | ✅ | ❌ |
| Crear admin locals | ✅ | ❌ |
| Invitar responsables en tu destino | ✅ | ✅ |
| Validar hospedajes en tu destino | ✅ | ✅ |
| Ver datos globales (todos destinos) | ✅ | ❌ |
| Crear promos en tu destino | ✅ | ✅ |

---

## Acceso y login

### Cómo entrar

1. Ve a **https://misescapadas.com.ar/admin/login**
2. Ingresa tu **email** (ej: `lasgaviotas@misescapadas.com.ar`)
3. Ingresa tu **contraseña**
4. ¡Listo! Estás adentro

### Recuperar contraseña

Si olvidaste:
1. Click en "¿Olvidaste tu contraseña?"
2. Ingresa tu email
3. Revisa tu correo (puede tardarse 1-2 min)
4. Click en el link
5. Establece nueva contraseña

---

## Dashboard principal

### Pantalla inicial

Cuando entras, ves:

```
┌─────────────────────────────────┐
│  Mis Escapadas                  │
│  Las Gaviotas                   │
│  Admin · Las Gaviotas           │
└─────────────────────────────────┘

MENÚ LATERAL:
├─ Dashboard
├─ Cola de validación
├─ Hospedajes
├─ Gastronomía
├─ Qué hacer (Atractivos)
├─ Atracciones
├─ Promos
├─ Combos
├─ Consultas
├─ Datos útiles ← NUEVO
├─ Responsables
├─ Regiones (Super Admin)
├─ Ciudades (Super Admin)
├─ Zonas (Super Admin)
├─ Destinos (Super Admin)
├─ Administradores (Super Admin)
├─ Mi perfil
└─ Cerrar sesión
```

### Qué ver primero

1. **Cola de validación** → Hospedajes nuevos esperando validación
2. **Hospedajes** → Lista de todos (publicados + borradores)
3. **Consultas** → Viajeros preguntando
4. **Responsables** → Quién es quién

---

## Gestión de hospedajes

### Flujo: De cero a publicado

```
1. INVITAS responsable
   ↓
2. Responsable se registra + completa datos
   ↓
3. Hospedaje queda en "Cola de validación" (estado: BORRADOR)
   ↓
4. TÚ lo validas (verificas que sea real)
   ↓
5. TÚ lo publicas
   ↓
6. Aparece en misescapadas.com.ar
```

### Paso 1: Invitar un hospedaje

**Dónde:** Admin → Hospedajes → Botón "Nuevo"

**Qué cargas:**
- Nombre de hospedaje (ej: "Posada del Mar")
- Email del responsable
- WhatsApp del responsable (sin +549, ej: 2267 123456)

**El sistema hace:**
- Crea un "hospedaje borrador"
- Manda email al responsable con link de registro
- Responsable se registra y completa datos

### Paso 2: Validar hospedaje

**Dónde:** Admin → Cola de validación

**Qué verificas:**
- ✅ Nombre real
- ✅ Dirección correcta (busca en Google Maps)
- ✅ Fotos reales (no fake)
- ✅ Amenities que tiene
- ✅ Cantidad de habitaciones/unidades
- ✅ Precio coherente (no trucho)
- ✅ Contacto válido

**Si está OK:**
- Click "Aprobar"
- Hospedaje pasa a estado VALIDADO
- Responsable recibe email de aprobación

**Si falta algo:**
- Click "Rechazar"
- Pones comentario (ej: "Fotos borrosas")
- Responsable ve el feedback y puede corregir
- Vuelve a la cola cuando resubmite

### Paso 3: Publicar

**Dónde:** Admin → Hospedajes → Click en hospedaje → Botón "Publicar"

**Cambio de estado:**
- VALIDADO → PUBLICADO
- Ahora aparece en el buscador y en misescapadas.com.ar

**Nota:** El responsable NO puede publicar. Solo tú.

### Estados de hospedaje

| Estado | Quién ve | Dónde |
|--------|----------|-------|
| BORRADOR | Solo responsable + admin | Cola validación |
| VALIDADO | Solo responsable + admin | Hospedajes (lista) |
| PUBLICADO | Viajeros + responsable + admin | Sitio web público |
| PAUSADO | Responsable + admin | No en buscador |
| RECHAZADO | Responsable + admin | Cola validación |

---

## Gestión de gastronomía

### Igual que hospedajes

El flujo es idéntico:

```
Invitas → Responsable completa → Validas → Publicas
```

**Dónde:** Admin → Gastronomía

**Diferencias:**
- Se llama "lugar gastronómico"
- Puede ser restaurante, café, bar, heladería, etc.
- Responsable es el dueño/cocinero

**Validar:**
- ✅ Nombre del lugar
- ✅ Dirección (Google Maps)
- ✅ Tipo de cocina
- ✅ Horarios
- ✅ Fotos de platos
- ✅ Contacto/Reservas

---

## Datos útiles

### Qué son

Servicios útiles por rubro:
- 🏥 **Salud** — Hospitales, clínicas, farmacias
- 🚨 **Emergencias** — Policía, bomberos, ambulancia
- 🚕 **Transporte** — Taxis, remises, buses
- 🎭 **Entretenimiento** — Cines, teatros, boliches
- ℹ️ **Información** — Oficinas de turismo

### Dónde lo ves

**Visitor:** Botón "Datos útiles" en la home de Las Gaviotas  
**Admin:** Menú → Datos útiles

### Cómo cargar

**Admin → Datos útiles:**

1. Click "Agregar dato útil"
2. Llenar:
   - **Rubro** (ej: Emergencias)
   - **Nombre** (ej: "Hospital San Carlos")
   - **Dirección** (ej: "Avenida Principal 123")
   - **Contacto** (ej: "2267 123456" o "email@hospital.com")
3. Click "Guardar"
4. Listo, aparece en el modal para viajeros

### Datos útiles para viajeros

Cuando un viajero click "Datos útiles":
- Ve rubros en carrusel horizontal (scroll con flechas)
- Click en un rubro → ve lista de servicios
- Click en dirección → abre Google Maps
- Puede ver teléfono de contacto

---

## Promos y combos

### Promos

**Qué es:** Descuento en un hospedaje por tiempo limitado.

**Ejemplo:** "Posada del Mar: 20% off en octubre"

**Dónde:** Admin → Promos → Crear nueva

**Cargas:**
- Hospedaje (ej: Posada del Mar)
- Nombre promo (ej: "Octubre de descuento")
- Descuento % (ej: 20)
- Fecha inicio
- Fecha fin
- Descripción (ej: "Sólo en habitaciones dobles")

**Viajero ve:**
- Promo destacada en la home de Las Gaviotas
- Descuento en la ficha del hospedaje

### Combos

**Qué es:** Paquete con múltiples servicios.

**Ejemplo:** "Hospedaje Posada + Cena en La Cocina + Tour a la costa = $500"

**Dónde:** Admin → Combos → Crear nuevo

**Cargas:**
- Nombre combo (ej: "Fin de semana romántico")
- Hospedajes (1 o más)
- Lugares gastronómicos (1 o más)
- Atracciones (1 o más)
- Foto (heroico del combo)
- Descripción
- Descuento (opcional)

**Viajero ve:**
- Combo en home de Las Gaviotas
- Puede filtrar combos que incluyen su hospedaje favorito

---

## Consultas y leads

### Qué es

Un viajero entra a Las Gaviotas, ve un hospedaje, y hace una pregunta:

```
Viajero: "¿Aceptan mascotas en Posada del Mar?"
```

### Flujo

```
Viajero pregunta en web
    ↓
Responsable del hospedaje recibe email
    ↓
Responsable responde
    ↓
Viajero ve la respuesta en web
```

### Dónde lo ves (Admin)

**Admin → Consultas**

- Ver todas las preguntas
- Ver respuestas
- Verificar que responsables responden rápido
- Hacer seguimiento

**No respondes tú.** El responsable responde.

---

## Responsables

### Quiénes son

Dueños de hospedajes, cocineros, gerentes. Personas que usan tú invitas.

### Qué ven ellos

Cuando se registran como responsable, acceden a:
- Ver su hospedaje/lugar gastronómico
- Editar datos (fotos, descripción, amenities)
- Editar disponibilidad (calendario)
- Editar tarifas (precios)
- Ver consultas de viajeros y responder
- Ver perfiles de quién preguntó

### Qué ves tú de ellos

**Admin → Responsables:**
- Lista de todos los responsables
- Hospedajes/lugares que gestiona cada uno
- Email
- WhatsApp
- Fecha de registro
- Estado de validación

### Cómo invitar

Ya vimos en "Gestión de hospedajes" → Paso 1.

### Si un responsable es irresponsable

- ❌ No edita datos
- ❌ No responde consultas
- ❌ Sube fotos fake

**Acciones:**
1. Contactalo (WhatsApp/email)
2. Pídele que corrija
3. Si no responde, pausá su hospedaje
4. Si es crítico, rechazá y no lo publiques más

---

## Mejores prácticas

### 1. Validar es clave

No publiques nada sin verificar. Una foto fake o dato incorrecto daña la confianza.

**Checklist validación:**
- [ ] Dirección real (Google Maps)
- [ ] Fotos de calidad (móvil / cámara, NO AI)
- [ ] Nombre coherente
- [ ] Precio realista
- [ ] Contacto funcional

### 2. Responsables ≠ Clientes

No los trates mal. Son socios. Necesitan ayuda, aclaraciones, feedback.

**Tono:** Profesional, amable, rápido.

### 3. Responder rápido

Consultas de viajeros → responsables responden. Si tarda 1 semana, pierdes venta.

**Meta:** Respuesta en 24h.

### 4. Fotos = Todo

Una buena foto vende más que 100 palabras.

- ✅ Luz natural
- ✅ Ángulo amplio (paisaje)
- ✅ Limpio y ordenado
- ❌ Oscuro
- ❌ Zoom extremo
- ❌ Borroso

### 5. Precios competitivos

Revisa cada tanto que no haya hospedajes de la competencia más baratos por lo mismo.

Si sospechas que alguien falsificó precio, valida en web o WhatsApp.

### 6. Datos útiles actualizado

Farmacia cambia de horario → actualizar.  
Taxi ya no atiende → quitar.  
Nuevo hospital abierto → agregar.

Esto inspira confianza.

### 7. Usa promos en épocas bajas

Octubre lluvia → 15% off.  
Invierno → combo con cena.

Atrae viajeros en temporada baja.

---

## Soporte

### Dudas sobre la plataforma

**Contacta a:** Super Admin Mis Escapadas

**Canales:**
- Email: `soporte@misescapadas.com.ar`
- WhatsApp: [a confirmar]
- Chat en admin (si existe)

### Dudas sobre datos comerciales

**Responsables locales:** Pídeles que actúen.  
**Datos globales:** Contacta Super Admin.

### Reportar bug

Si algo no funciona:
1. Toma screenshot
2. Describe qué quisiste hacer
3. Mandá a Super Admin

**Ej:** "Intenté editar Posada del Mar y se congela la página"

---

## Checklist de onboarding

Antes de empezar oficialmente:

- [ ] Puedo loguearme
- [ ] Veo el dashboard
- [ ] Entiendo la jerarquía (yo, responsables, viajeros)
- [ ] Sé cómo invitar un hospedaje
- [ ] Sé cómo validar
- [ ] Sé cómo publicar
- [ ] Entiendo Datos Útiles
- [ ] Entiendo Promos y Combos
- [ ] Sé responder en Consultas (o pido al responsable)
- [ ] Tengo contacto de Super Admin para soporte

---

## Resumen ejecutivo

**Tu rol:** Validar, publicar, gestionar.

**Flujo base:**
1. Invitar responsable
2. Responsable completa datos
3. Validar (verificar que sea real)
4. Publicar (decidir qué se ve en web)

**Responsables:** Son tus aliados. Apoya, verifica, pero no hagas su trabajo.

**Calidad:** Una foto fake o dato incorrecto daña todo. Verifica todo.

**Viajeros:** Son los clientes finales. Mejor experiencia = más reservas.

---

**¿Preguntas?** Pregunta al Super Admin.

**¿Listo?** ¡A trabajar!
