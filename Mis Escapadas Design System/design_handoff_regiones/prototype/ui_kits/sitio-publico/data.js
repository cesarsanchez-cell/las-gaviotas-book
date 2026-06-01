// Mock data — la red Mis Escapadas con 4 destinos del eje pinar-playa
// (Las Gaviotas, Mar Azul, Mar de las Pampas, Colonia Marina). Cada
// destino lleva su clima, biomas, ubicación, transporte y catálogo.

window.MOCK = {
  red: {
    nombre: "Mis Escapadas",
    tagline: "Red de portales turísticos locales",
    descripcion:
      "Cada destino es una comunidad propia que valida sus hospedajes. Elegí a dónde querés escaparte.",
  },

  // Regiones — agrupamiento geográfico-cultural curado por el super admin.
  // Cada destino pertenece a una. Esto es lo que el viajero ve primero en
  // el hub cuando la red tiene miles de destinos.
  // activo = visible si tiene >=1 destino publicado con >=1 hospedaje.
  // destinos_slugs = slugs de los destinos que pertenecen a la región.
  regiones: [
    { slug: "costa-atlantica-bonaerense", nombre: "Costa Atlántica Bonaerense", activo: true,
      descripcion: "Pinares al borde del Atlántico. Pueblos chicos, mar abierto, brasas y bici.",
      biomas: ["playa", "bosque"], destinos_count: 24,
      destinos_slugs: ["las-gaviotas", "mar-azul", "mar-de-las-pampas", "colonia-marina"] },
    { slug: "sierras-de-cordoba", nombre: "Sierras de Córdoba", activo: true,
      descripcion: "Pueblos serranos, ríos de montaña, aire seco y noches frescas.",
      biomas: ["sierra", "bosque"], destinos_count: 1,
      destinos_slugs: ["merlo"] },
    { slug: "patagonia-lacustre", nombre: "Patagonia Lacustre", activo: true,
      descripcion: "Lagos profundos, bosques andinos, cerros con nieve y truchas.",
      biomas: ["lago", "montana"], destinos_count: 3,
      destinos_slugs: ["bariloche", "villa-la-angostura", "el-bolson"] },
    { slug: "cuyo-vitivinicola", nombre: "Cuyo Vitivinícola", activo: true,
      descripcion: "Bodegas, oasis al pie de la cordillera y rutas de altura.",
      biomas: ["montana", "desierto"], destinos_count: 1,
      destinos_slugs: ["san-rafael"] },
    { slug: "norte-andino", nombre: "Norte Andino", activo: true,
      descripcion: "Quebradas con color, pueblos de altura y vino de las nubes.",
      biomas: ["montana", "desierto"], destinos_count: 2,
      destinos_slugs: ["cafayate", "tilcara"] },
    // Sin destinos publicados todavía — NO debe aparecer en el hub.
    { slug: "termas-argentinas", nombre: "Termas", activo: true,
      descripcion: "Aguas que curan en Federación, Río Hondo, Reyes y más.",
      biomas: ["sierra"], destinos_count: 0, destinos_slugs: [] },
    { slug: "litoral-iguazu", nombre: "Litoral e Iguazú", activo: true,
      descripcion: "Ríos enormes, esteros, selva y la frontera tropical.",
      biomas: ["bosque", "lago"], destinos_count: 0, destinos_slugs: [] },
    // Región despublicada por el super admin — NO debe aparecer.
    { slug: "patagonia-atlantica", nombre: "Patagonia Atlántica", activo: false,
      descripcion: "Acantilados, fauna marina y los glaciares del sur.",
      biomas: ["playa", "montana"], destinos_count: 12, destinos_slugs: [] },
  ],

  // Carousels: destinos "trending" + "recién sumados". Stubs livianos —
  // sólo lo que la mini-card necesita renderizar.
  trending: [
    { slug: "bariloche",         nombre: "Bariloche",         region: "Patagonia Lacustre",          biomas: ["lago", "montana"], hospedajes_count: 312, lat: -41.1333, lng: -71.3000 },
    { slug: "mar-de-las-pampas", nombre: "Mar de las Pampas", region: "Costa Atlántica Bonaerense", biomas: ["bosque", "playa"], hospedajes_count: 24, lat: -37.3667, lng: -57.0000 },
    { slug: "cafayate",          nombre: "Cafayate",          region: "Norte Andino",               biomas: ["montana", "desierto"], hospedajes_count: 47, lat: -26.0833, lng: -65.9667 },
    { slug: "villa-la-angostura",nombre: "Villa La Angostura",region: "Patagonia Lacustre",          biomas: ["lago", "montana"], hospedajes_count: 89, lat: -40.7667, lng: -71.6500 },
    { slug: "tilcara",           nombre: "Tilcara",           region: "Norte Andino",               biomas: ["montana"], hospedajes_count: 56, lat: -23.5833, lng: -65.4000 },
    { slug: "san-rafael",        nombre: "San Rafael",        region: "Cuyo Vitivinícola",          biomas: ["montana"], hospedajes_count: 38, lat: -34.6167, lng: -68.3333 },
  ],
  recientes: [
    { slug: "colonia-marina",  nombre: "Colonia Marina",  region: "Costa Atlántica Bonaerense", biomas: ["bosque", "playa"], hospedajes_count: 6,  agregadoHace: "hace 3 días",   lat: -37.3833, lng: -57.0167 },
    { slug: "uquia",           nombre: "Uquía",           region: "Norte Andino",                biomas: ["montana"],          hospedajes_count: 4,  agregadoHace: "hace 1 semana", lat: -23.3000, lng: -65.3500 },
    { slug: "merlo",           nombre: "Merlo",           region: "Sierras de Córdoba",          biomas: ["sierra"],           hospedajes_count: 19, agregadoHace: "hace 2 semanas", lat: -32.3500, lng: -65.0167 },
    { slug: "el-bolson",       nombre: "El Bolsón",       region: "Patagonia Lacustre",          biomas: ["bosque", "montana"], hospedajes_count: 27, agregadoHace: "hace 3 semanas", lat: -41.9667, lng: -71.5333 },
  ],

  destinos: [
    {
      slug: "las-gaviotas",
      nombre: "Las Gaviotas",
      region: "Partido de la Costa",
      provincia: "Buenos Aires",
      pais: "Argentina",
      lat: -36.7167, lng: -56.7000,
      descripcion_corta:
        "Pueblo costero entre pinares y mar. Paz, bici tranquila y la calidez de un pueblo que se conoce.",
      personalidad: "Calmo, familiar — las primeras filas del bosque al mar.",
      biomas: ["playa", "bosque"],
      hospedajes_count: 12,
      gastros_count: 8,
      atractivos_count: 6,
      weather: { temp: 23, cond: "Soleado", icon: "sun", max: 26, min: 14, hum: 62, uv: 7, wind: "NE 12 km/h",
        sunrise: "06:42", sunset: "19:38",
        marea: { proxima: "Pleamar 14:30", siguiente: "Bajamar 20:15", altura: "1.4 m" } },
      map: { label: "Las Gaviotas, Partido de la Costa", mapsUrl: "https://maps.google.com/?q=Las+Gaviotas+Argentina" },
      transporte: [
        { mode: "Auto",         icon: "car",            det: "RN 11 · Mar de Ajó",     time: "4h 30'" },
        { mode: "Bus",          icon: "bus",            det: "Retiro → San Bernardo",  time: "5h 15'" },
        { mode: "Tren + combi", icon: "train-front",    det: "Constitución · Lavalle", time: "6h"    },
        { mode: "Avión + combi",icon: "plane-takeoff",  det: "EZE · V. Cardini",       time: "2h 45'" },
      ],
      hero: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80",
      thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=70",
    },
    {
      slug: "mar-azul",
      nombre: "Mar Azul",
      region: "Villa Gesell",
      provincia: "Buenos Aires",
      pais: "Argentina",
      lat: -37.3500, lng: -57.0000,
      descripcion_corta:
        "Médanos altos y pinar denso. El silencio del bosque cae sobre la playa y el día se hace largo.",
      personalidad: "Reposado, pinar grueso pegado al mar.",
      biomas: ["playa", "bosque"],
      hospedajes_count: 18,
      gastros_count: 11,
      atractivos_count: 7,
      weather: { temp: 22, cond: "Parcialmente nublado", icon: "cloud-sun", max: 25, min: 13, hum: 70, uv: 6, wind: "E 18 km/h",
        sunrise: "06:48", sunset: "19:33",
        marea: { proxima: "Pleamar 15:10", siguiente: "Bajamar 21:00", altura: "1.6 m" } },
      map: { label: "Mar Azul, Villa Gesell", mapsUrl: "https://maps.google.com/?q=Mar+Azul+Argentina" },
      transporte: [
        { mode: "Auto",         icon: "car",           det: "RP 11 · Villa Gesell sur", time: "4h 45'" },
        { mode: "Bus",          icon: "bus",           det: "Retiro → Villa Gesell + combi", time: "5h 30'" },
        { mode: "Avión + combi",icon: "plane-takeoff", det: "EZE · Villa Gesell",       time: "3h"    },
      ],
      hero: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2000&q=80",
      thumb: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=70",
    },
    {
      slug: "mar-de-las-pampas",
      nombre: "Mar de las Pampas",
      region: "Villa Gesell",
      provincia: "Buenos Aires",
      pais: "Argentina",
      lat: -37.3667, lng: -57.0000,
      descripcion_corta:
        "Bosque cuidado, calles de arena, mesa larga al atardecer. La calma de un pueblo que respira despacio.",
      personalidad: "Pinar y mesa larga — el pueblo que respira despacio.",
      biomas: ["bosque", "playa"],
      hospedajes_count: 24,
      gastros_count: 17,
      atractivos_count: 9,
      weather: { temp: 21, cond: "Brisa fresca", icon: "wind", max: 24, min: 13, hum: 73, uv: 5, wind: "E 22 km/h",
        sunrise: "06:50", sunset: "19:30",
        marea: { proxima: "Pleamar 15:25", siguiente: "Bajamar 21:18", altura: "1.5 m" } },
      map: { label: "Mar de las Pampas, Villa Gesell", mapsUrl: "https://maps.google.com/?q=Mar+de+las+Pampas+Argentina" },
      transporte: [
        { mode: "Auto",         icon: "car",           det: "RP 11 · Villa Gesell sur", time: "4h 40'" },
        { mode: "Bus",          icon: "bus",           det: "Retiro → V. Gesell · combi", time: "5h 30'" },
        { mode: "Avión + combi",icon: "plane-takeoff", det: "EZE · Villa Gesell",       time: "3h"    },
      ],
      hero: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=2000&q=80",
      thumb: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=900&q=70",
    },
    {
      slug: "colonia-marina",
      nombre: "Colonia Marina",
      region: "Villa Gesell",
      provincia: "Buenos Aires",
      pais: "Argentina",
      lat: -37.3833, lng: -57.0167,
      descripcion_corta:
        "El más reservado del eje. Pinar de altura, lotes grandes, quietud que abriga.",
      personalidad: "Reserva chica, pinar entero, silencio que descansa.",
      biomas: ["bosque", "playa"],
      hospedajes_count: 6,
      gastros_count: 4,
      atractivos_count: 5,
      weather: { temp: 20, cond: "Despejado", icon: "sun", max: 23, min: 12, hum: 68, uv: 6, wind: "SE 14 km/h",
        sunrise: "06:52", sunset: "19:29",
        marea: { proxima: "Pleamar 15:42", siguiente: "Bajamar 21:30", altura: "1.5 m" } },
      map: { label: "Colonia Marina, Villa Gesell", mapsUrl: "https://maps.google.com/?q=Colonia+Marina+Argentina" },
      transporte: [
        { mode: "Auto", icon: "car", det: "RP 11 · Villa Gesell sur",      time: "4h 50'" },
        { mode: "Bus",  icon: "bus", det: "Retiro → V. Gesell · combi",    time: "5h 40'" },
      ],
      hero: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2000&q=80",
      thumb: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=70",
    },
  ],

  // Catálogo por destino — usamos Las Gaviotas como ejemplo completo y
  // un par de placeholders para los demás. El operador local sube el resto.
  hospedajesPorDestino: {
    "las-gaviotas": [
      { slug: "cabanas-del-faro", nombre: "Cabañas del Faro", tipo: "cabaña", descripcion_corta: "Cuatro cabañas frente al mar, parrillas individuales y bajada propia a la playa.", direccion: "Av. Costanera 1240", capacidad: 6, unidades: 4, amenities: ["wifi","waves","flame","car"], destacado: true, photo: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=70" },
      { slug: "apart-medanos", nombre: "Apart Médanos", tipo: "apart", descripcion_corta: "Aparts modernos a cuatro cuadras del centro. Pet friendly, piscina compartida.", direccion: "Calle 9 entre 24 y 25", capacidad: 4, unidades: 8, amenities: ["wifi","dog","car","users"], destacado: false, photo: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=70" },
      { slug: "casa-pinar", nombre: "Casa Pinar", tipo: "casa", descripcion_corta: "Casa de tres ambientes en el medio del pinar. Quincho cubierto, parrilla.", direccion: "Calle 32 entre 11 y 12", capacidad: 6, unidades: 1, amenities: ["wifi","trees","flame"], destacado: false, photo: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=900&q=70" },
    ],
    "mar-azul": [
      { slug: "cabana-medano", nombre: "Cabaña del Médano", tipo: "cabaña", descripcion_corta: "Madera y vidrio, vista directa al pinar. A 80 metros de la bajada 7.", direccion: "Calle del Indio 412", capacidad: 5, unidades: 1, amenities: ["wifi","trees","flame","car"], destacado: true, photo: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=900&q=70" },
      { slug: "aparts-azul", nombre: "Aparts Azul", tipo: "apart", descripcion_corta: "Seis aparts equipados con vista al pinar, parrillas individuales.", direccion: "Av. del Mar y 13", capacidad: 4, unidades: 6, amenities: ["wifi","car","flame"], destacado: false, photo: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=70" },
    ],
    "mar-de-las-pampas": [
      { slug: "del-bosque", nombre: "Cabañas del Bosque", tipo: "cabaña", descripcion_corta: "Cinco cabañas de troncos en una hectárea de pinar. Piscina climatizada y parrilla.", direccion: "Tirso de Molina y Querandíes", capacidad: 6, unidades: 5, amenities: ["wifi","trees","flame","car"], destacado: true, photo: "https://images.unsplash.com/photo-1444090542259-0af8fa96557e?auto=format&fit=crop&w=900&q=70" },
      { slug: "boutique-norte", nombre: "Boutique Norte", tipo: "hotel", descripcion_corta: "Hotel boutique de 12 habitaciones, desayuno gourmet, spa pequeño.", direccion: "Cruz del Sur 480", capacidad: 2, unidades: 12, amenities: ["wifi","users","car"], destacado: false, photo: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=70" },
    ],
    "colonia-marina": [
      { slug: "casa-pinar-cm", nombre: "Casa del Pinar", tipo: "casa", descripcion_corta: "Casa de 4 ambientes con galería en lote de 1200m². Mucho silencio.", direccion: "Calle 6 y 21", capacidad: 8, unidades: 1, amenities: ["wifi","trees","flame","car"], destacado: true, photo: "https://images.unsplash.com/photo-1502780402662-acc01917cf36?auto=format&fit=crop&w=900&q=70" },
    ],
  },

  imperdiblesPorDestino: {
    "las-gaviotas": [
      { slug: "playa-norte", nombre: "Playa Norte de Las Gaviotas", categoria: "Playas", descripcion_corta: "Cuatro kilómetros de arena fina, sin paradores en alta. La favorita de los locales.", direccion: "Bajadas 1 a 18", imperdible: true, photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=70" },
      { slug: "bosque-energetico", nombre: "Bosque Energético", categoria: "Bosques", descripcion_corta: "Pinar centenario en el corazón del pueblo. Senderos cortos, picnic permitido.", direccion: "Calle 16 y Brown", imperdible: true, photo: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=70" },
      { slug: "muelle-puesta", nombre: "Muelle de la puesta", categoria: "Miradores", descripcion_corta: "El mejor lugar del partido para ver el atardecer sobre el río. Llevar abrigo.", direccion: "Bajada 6", imperdible: false, photo: "https://images.unsplash.com/photo-1504714146340-959ca07e1f38?auto=format&fit=crop&w=900&q=70" },
    ],
    "mar-azul": [
      { slug: "bajada-7", nombre: "Bajada 7", categoria: "Playas", descripcion_corta: "La bajada más amplia, médano alto y mar abierto. Surf todo el año.", direccion: "Av. del Mar y 7", imperdible: true, photo: "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=900&q=70" },
      { slug: "pinar-sur", nombre: "Pinar Sur", categoria: "Bosques", descripcion_corta: "Sendero de 2 km que conecta el centro con la reserva.", direccion: "Calle del Indio", imperdible: true, photo: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=70" },
    ],
    "mar-de-las-pampas": [
      { slug: "querandies", nombre: "Calle Querandíes", categoria: "Urbano", descripcion_corta: "El paseo central. Restaurantes, deli, librerías y vermut al atardecer.", direccion: "Querandíes", imperdible: true, photo: "https://images.unsplash.com/photo-1504714146340-959ca07e1f38?auto=format&fit=crop&w=900&q=70" },
      { slug: "pinar-pampas", nombre: "Pinar de Mar de las Pampas", categoria: "Bosques", descripcion_corta: "Pinares cuidados con senderos demarcados y bici tranquila.", direccion: "Reserva norte", imperdible: true, photo: "https://images.unsplash.com/photo-1502780402662-acc01917cf36?auto=format&fit=crop&w=900&q=70" },
    ],
    "colonia-marina": [
      { slug: "playa-cm", nombre: "Playa de Colonia Marina", categoria: "Playas", descripcion_corta: "Mar abierto y sin paradores. Llevar agua y sombra.", direccion: "Bajada principal", imperdible: true, photo: "https://images.unsplash.com/photo-1444090542259-0af8fa96557e?auto=format&fit=crop&w=900&q=70" },
    ],
  },

  // Combos curados por el admin local del destino — la sinergia comercial
  // que es el diferencial de Mis Escapadas. Cada combo arma hospedaje +
  // gastro + atractivo + uno o más beneficios cruzados.
  // Cross-promociones — qué descuento se activa cuando el cliente arma una
  // combinación específica en el Armador. La regla cruzada es lo que hace
  // único al combo "Mis Escapadas". Modelo: array de reglas por destino;
  // cada regla matchea por slug del hospedaje + slug del gastro/atractivo.
  crossPromosPorDestino: {
    "las-gaviotas": [
      // hospedaje × gastronomía
      { when: { hospedaje: "cabanas-del-faro", gastronomia: "parrilla-don-jose" },
        beneficio: "15% off en la cena mostrando la reserva del apart", tipo: "off-gastro", pct: 15 },
      { when: { hospedaje: "cabanas-del-faro", gastronomia: "cafe-orilla" },
        beneficio: "Brunch para 2 sin cargo al hacer check-in", tipo: "gratis-gastro" },
      { when: { hospedaje: "casa-pinar", gastronomia: "cafe-orilla" },
        beneficio: "20% off brunch + late check-out hasta las 14h", tipo: "off-gastro", pct: 20 },
      { when: { hospedaje: "apart-medanos", gastronomia: "parrilla-don-jose" },
        beneficio: "Botella de vino de la casa sin cargo", tipo: "gratis-bebida" },
      // hospedaje × atractivo
      { when: { hospedaje: "cabanas-del-faro", atractivo: "playa-norte" },
        beneficio: "Caminata guiada al amanecer · sin cargo para huéspedes", tipo: "gratis-atractivo" },
      { when: { hospedaje: "casa-pinar", atractivo: "bosque-energetico" },
        beneficio: "Picnic en el pinar con mantas + termo de café", tipo: "gratis-atractivo" },
      { when: { hospedaje: "apart-medanos", atractivo: "muelle-puesta" },
        beneficio: "Transfer al muelle al atardecer + copa de vino", tipo: "gratis-atractivo" },
      // gastronomía × atractivo (más raro, pero existe)
      { when: { gastronomia: "parrilla-don-jose", atractivo: "playa-norte" },
        beneficio: "Sándwich + cerveza al volver de la caminata · 30% off", tipo: "off-gastro", pct: 30 },
    ],
    "mar-azul": [
      { when: { hospedaje: "cabana-medano", gastronomia: "el-pinar-resto" },
        beneficio: "Botella de vino sin cargo en la cena", tipo: "gratis-bebida" },
      { when: { hospedaje: "cabana-medano", atractivo: "bajada-7" },
        beneficio: "Clase de surf de iniciación incluida", tipo: "gratis-atractivo" },
      { when: { hospedaje: "aparts-azul", atractivo: "pinar-sur" },
        beneficio: "Bici eléctrica por 2 hs sin cargo", tipo: "gratis-atractivo" },
    ],
    "mar-de-las-pampas": [
      { when: { hospedaje: "del-bosque", gastronomia: "lola-bistro" },
        beneficio: "Menú degustación 5 pasos con 20% off", tipo: "off-gastro", pct: 20 },
      { when: { hospedaje: "del-bosque", gastronomia: "viejo-hobbit" },
        beneficio: "Pizza + vino sin cargo en la primera noche", tipo: "gratis-gastro" },
      { when: { hospedaje: "del-bosque", atractivo: "pinar-pampas" },
        beneficio: "Tour guiado en bici eléctrica · 2 hs", tipo: "gratis-atractivo" },
      { when: { hospedaje: "boutique-norte", atractivo: "querandies" },
        beneficio: "Welcome aperitivo en Querandíes con productor local", tipo: "gratis-atractivo" },
    ],
    "colonia-marina": [
      { when: { hospedaje: "casa-pinar-cm", gastronomia: "del-pino" },
        beneficio: "Café de especialidad + medialunas al check-in", tipo: "gratis-gastro" },
    ],
  },

  // Promos individuales — descuento o beneficio sobre UN comercio. El admin
  // local los carga independientes de la sinergia (combos).
  promosIndividualesPorDestino: {
    "las-gaviotas": [
      { slug: "faro-mid-week", ref: "cabanas-del-faro", tipo: "hospedaje",
        titulo: "Miércoles + jueves -25%",
        bajada: "Bajá la ocupación de semana en cabañas frente al mar.",
        beneficio: "25% off sobre la tarifa publicada", pct: 25,
        validez: "Hasta 30 nov 2026 · sujeto a disponibilidad",
        photo: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=70" },
      { slug: "orilla-brunch-2x1", ref: "cafe-orilla", tipo: "gastronomia",
        titulo: "Brunch 2x1 los sábados",
        bajada: "Mesa al sol con panificados propios y vista al mar.",
        beneficio: "Comprás 1 brunch y llevás 2", pct: 50,
        validez: "Sábados de 10 a 13h",
        photo: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=900&q=70" },
    ],
    "mar-azul": [
      { slug: "azul-aparts-finde", ref: "aparts-azul", tipo: "hospedaje",
        titulo: "Finde corto -20%",
        bajada: "2 noches en apart equipado con vista al pinar.",
        beneficio: "20% off entrando entre semana", pct: 20,
        validez: "Marzo a noviembre",
        photo: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=70" },
    ],
    "mar-de-las-pampas": [
      { slug: "lola-cumple", ref: "lola-bistro", tipo: "gastronomia",
        titulo: "Cumpleaños sin cargo",
        bajada: "El cumpleañero no paga su menú degustación.",
        beneficio: "Menú gratis con presentación de DNI · mesa min. 4 pax",
        validez: "Todo el año",
        photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=70" },
      { slug: "hobbit-mediodia", ref: "viejo-hobbit", tipo: "gastronomia",
        titulo: "Pizza + vino al mediodía",
        bajada: "Almuerzo en horno a leña con vino de productor.",
        beneficio: "Combo cerrado a $14.500 (descuento ~25%)", pct: 25,
        validez: "Lunes a viernes 12 a 15h",
        photo: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?auto=format&fit=crop&w=900&q=70" },
    ],
    "colonia-marina": [],
  },

  combosPorDestino: {
    "las-gaviotas": [
      {
        slug: "mar-y-mesa",
        titulo: "Mar y mesa",
        bajada: "Dos noches frente al bosque, una mesa con vista al mar y la caminata del amanecer.",
        noches: 2,
        precio_desde: 64000,
        ahorro_pct: 18,
        chips: [
          { type: "hospedaje",   ref: "cabanas-del-faro",   beneficio: "2 noches en cabaña para 4" },
          { type: "gastronomia", ref: "parrilla-don-jose",  beneficio: "Cena para 2 con 15% off mostrando la reserva" },
          { type: "atractivo",   ref: "playa-norte",        beneficio: "Caminata guiada al amanecer · sin cargo" },
        ],
        beneficios: [
          "Quien reserva la cena primero recibe 10% off en la próxima noche.",
          "Acceso anticipado a la playa antes de la apertura de paradores.",
        ],
        validez: "Válido domingo a jueves · hasta 30 nov 2026",
        photos: {
          hero: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=70",
          a:    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=70",
          b:    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=70",
          c:    "https://images.unsplash.com/photo-1504714146340-959ca07e1f38?auto=format&fit=crop&w=400&q=70",
        },
      },
      {
        slug: "finde-corto-pinar",
        titulo: "Finde corto al pinar",
        bajada: "Una noche para desenchufar — pinar, brasas y café con vista al amanecer.",
        noches: 1,
        precio_desde: 32500,
        ahorro_pct: 12,
        chips: [
          { type: "hospedaje",   ref: "casa-pinar",        beneficio: "Noche en casa de 3 amb (hasta 6 pax)" },
          { type: "gastronomia", ref: "cafe-orilla",       beneficio: "Brunch para 2 con 20% off" },
          { type: "atractivo",   ref: "bosque-energetico", beneficio: "Picnic en el pinar con mantas + termo" },
        ],
        beneficios: [
          "Late check-out hasta las 14h si reservás el brunch.",
        ],
        validez: "Válido finde largo · cupos limitados",
        photos: {
          hero: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=70",
          a:    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=400&q=70",
          b:    "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=400&q=70",
          c:    "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=70",
        },
      },
    ],
    "mar-azul": [
      {
        slug: "bajada-7",
        titulo: "Bajada 7 con sobremesa",
        bajada: "Cabaña entre médanos, surf de mañana y mesa larga frente al pinar al atardecer.",
        noches: 2,
        precio_desde: 72000,
        ahorro_pct: 15,
        chips: [
          { type: "hospedaje",   ref: "cabana-medano", beneficio: "2 noches en cabaña con vista al pinar" },
          { type: "gastronomia", ref: "el-pinar-resto", beneficio: "Cena de mar para 2 · botella de vino sin cargo" },
          { type: "atractivo",   ref: "bajada-7",      beneficio: "Clase de surf de iniciación · 1 sesión" },
        ],
        beneficios: ["Welcome pack con mate, bizcochos locales y mapa de senderos."],
        validez: "Marzo a noviembre · sujeto a clima",
        photos: {
          hero: "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=1200&q=70",
          a:    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=400&q=70",
          b:    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=70",
          c:    "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=400&q=70",
        },
      },
    ],
    "mar-de-las-pampas": [
      {
        slug: "mesa-bosque",
        titulo: "Mesa en el bosque",
        bajada: "Dos noches en cabaña de troncos y dos cenas en los restaurantes más boutique del pueblo.",
        noches: 2,
        precio_desde: 98000,
        ahorro_pct: 20,
        chips: [
          { type: "hospedaje",   ref: "del-bosque",   beneficio: "2 noches con piscina climatizada + late check-out" },
          { type: "gastronomia", ref: "lola-bistro",  beneficio: "Menú degustación 5 pasos · maridaje incluido" },
          { type: "atractivo",   ref: "pinar-pampas", beneficio: "Tour guiado en bici eléctrica · 2 hs" },
        ],
        beneficios: ["Welcome a la habitación con vino de productor local."],
        validez: "Septiembre a junio · cupos limitados",
        photos: {
          hero: "https://images.unsplash.com/photo-1502780402662-acc01917cf36?auto=format&fit=crop&w=1200&q=70",
          a:    "https://images.unsplash.com/photo-1444090542259-0af8fa96557e?auto=format&fit=crop&w=400&q=70",
          b:    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=70",
          c:    "https://images.unsplash.com/photo-1502780402662-acc01917cf36?auto=format&fit=crop&w=400&q=70",
        },
      },
    ],
    "colonia-marina": [],
  },

  gastroPorDestino: {
    "las-gaviotas": [
      { slug: "parrilla-don-jose", nombre: "Parrilla Don José", categoria: "Parrilla", descripcion_corta: "Brasa, costilla, achuras. Vino de la casa decente. Reservar en temporada.", direccion: "Av. 1 esq. 12", photo: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=70" },
      { slug: "cafe-orilla", nombre: "Café Orilla", categoria: "Café", descripcion_corta: "Brunch frente al mar, panificados propios. Imbatible al sol de la mañana.", direccion: "Bajada 4", photo: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=900&q=70" },
    ],
    "mar-azul": [
      { slug: "el-pinar-resto", nombre: "El Pinar", categoria: "Restaurant", descripcion_corta: "Cocina de mar en el bosque. Mesa al aire libre.", direccion: "Av. del Mar 220", photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=70" },
    ],
    "mar-de-las-pampas": [
      { slug: "viejo-hobbit", nombre: "El Viejo Hobbit", categoria: "Restaurant", descripcion_corta: "Clásico del pueblo. Pizzas de masa madre en horno a leña.", direccion: "Cruz del Sur y Querandíes", photo: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?auto=format&fit=crop&w=900&q=70" },
      { slug: "lola-bistro", nombre: "Lola Bistró", categoria: "Bistró", descripcion_corta: "Menú degustación de 5 pasos, vinos de productores chicos.", direccion: "Querandíes 1830", photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=70" },
    ],
    "colonia-marina": [
      { slug: "del-pino", nombre: "Del Pino", categoria: "Café", descripcion_corta: "Café de especialidad, pastelería pequeña. Solo finde.", direccion: "Calle 4", photo: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=900&q=70" },
    ],
  },
};

// Helper accessor.
// Reglas de publicación (mock client-side; en prod esto va en server queries).
// Un destino se considera publicado si tiene >=1 hospedaje publicado.
window.isDestinoPublicado = function isDestinoPublicado(slug) {
  const hosp = window.MOCK.hospedajesPorDestino[slug] || [];
  return hosp.length > 0;
};

// Una región se publica si activo=true Y tiene >=1 destino publicado.
window.isRegionPublicada = function isRegionPublicada(region) {
  if (!region.activo) return false;
  return (region.destinos_slugs || []).some((s) => window.isDestinoPublicado(s));
};

window.getPublishedRegiones = function getPublishedRegiones() {
  return window.MOCK.regiones.filter(window.isRegionPublicada);
};

window.getPublishedDestinos = function getPublishedDestinos() {
  return window.MOCK.destinos.filter((d) => window.isDestinoPublicado(d.slug));
};

// Devuelve los destinos PUBLICADOS de una región.
window.getDestinosDeRegion = function getDestinosDeRegion(regionSlug) {
  const region = window.MOCK.regiones.find((r) => r.slug === regionSlug);
  if (!region) return [];
  return region.destinos_slugs
    .filter((s) => window.isDestinoPublicado(s))
    .map((s) => window.MOCK.destinos.find((d) => d.slug === s))
    .filter(Boolean);
};

  // Aggregator para el hub v2 (Airbnb style): toma todos los items
  // publicados de un vertical, agrega referencia al destino para mostrar
  // "ciudad · region · pais" en la card.
  window.getAllByVertical = function getAllByVertical(vertical) {
    // vertical: "hospedajes" | "gastronomia" | "atractivos"
    const pool = [];
    window.MOCK.destinos.forEach((d) => {
      if (!window.isDestinoPublicado(d.slug)) return;
      let items = [];
      if (vertical === "hospedajes")  items = window.MOCK.hospedajesPorDestino[d.slug]  || [];
      if (vertical === "gastronomia") items = window.MOCK.gastroPorDestino[d.slug]      || [];
      if (vertical === "atractivos")  items = window.MOCK.imperdiblesPorDestino[d.slug] || [];
      items.forEach((it) => pool.push({ ...it, _destino: d, _vertical: vertical }));
    });
    return pool;
  };

  // Promos: 2 fuentes — individuales (descuento sobre 1 comercio) + sinergia
  // (combos curados que requieren hospedaje + gastro + atractivo). Cada item
  // del pool lleva _kind: "individual" | "sinergia".
  window.getAllPromos = function getAllPromos() {
    const pool = [];
    window.MOCK.destinos.forEach((d) => {
      if (!window.isDestinoPublicado(d.slug)) return;
      // Individuales
      const ind = window.MOCK.promosIndividualesPorDestino?.[d.slug] || [];
      ind.forEach((p) => pool.push({ ...p, _destino: d, _kind: "individual", _vertical: "promos" }));
      // Sinergias (combos curados)
      const combos = window.MOCK.combosPorDestino?.[d.slug] || [];
      combos.forEach((c) => pool.push({ ...c, _destino: d, _kind: "sinergia", _vertical: "promos" }));
    });
    return pool;
  };

window.getDestinoData = function getDestinoData(slug) {
  const destino = window.MOCK.destinos.find((d) => d.slug === slug);
  return {
    destino,
    hospedajes:  window.MOCK.hospedajesPorDestino[slug]  || [],
    imperdibles: window.MOCK.imperdiblesPorDestino[slug] || [],
    gastronomia: window.MOCK.gastroPorDestino[slug]      || [],
    combos:      window.MOCK.combosPorDestino?.[slug]    || [],
    crossPromos: window.MOCK.crossPromosPorDestino?.[slug] || [],
    promosIndividuales: window.MOCK.promosIndividualesPorDestino?.[slug] || [],
  };
};

/**
 * Resuelve qué beneficios cruzados aplican a una selección del armador.
 * Una regla matchea cuando TODAS las claves de `when` están en la selección.
 * Ej: regla { hospedaje:'x', gastro:'y' } matchea sólo si el cliente eligió
 * ambos. Reglas con sólo `hospedaje` matchearían siempre que se eligió X
 * (no es lo común, pero queda soportado).
 */
window.matchCrossPromos = function matchCrossPromos(promos, sel) {
  // sel: { hospedaje?: slug, gastronomia?: slug, atractivo?: slug }
  return promos.filter((p) => {
    return Object.entries(p.when).every(([k, v]) => sel[k] === v);
  });
};
