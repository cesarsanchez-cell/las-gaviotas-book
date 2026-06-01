// HubView.jsx — Hub paraguas, escalable a miles de destinos.
// Estructura:
//   1) SearchHero      → buscador + 4 pills rápidas + vista mapa
//   2) Regiones        → 25 cards de regiones curadas
//   3) Cerca tuyo      → prompt geolocation + carousel
//   4) Tendencia       → carousel
//   5) Recién sumados  → carousel
//   6) Por bioma       → chips transversales
//   7) CTA comerciante → sumar tu propuesta

function HubView({ destinos, regiones, trending, recientes, onOpenDestino, onOpenRegion, onOpenBioma, onOpenMap }) {
  // Aplica reglas de publicación: solo regiones activas con >=1 destino
  // publicado, y dentro de carousels solo destinos publicados.
  const regionesPub  = (window.getPublishedRegiones?.() || regiones).filter(Boolean);
  const destinosPub  = (window.getPublishedDestinos?.() || destinos).filter(Boolean);
  const trendingPub  = trending.filter((d) => window.isDestinoPublicado?.(d.slug) ?? true);
  const recientesPub = recientes.filter((d) => window.isDestinoPublicado?.(d.slug) ?? true);
  return (
    <>
      <SearchHero
        destinos={destinosPub}
        onPickDestino={onOpenDestino}
        onPickBioma={onOpenBioma}
        onOpenMap={onOpenMap}
      />

      <Section
        id="regiones"
        eyebrowIcon="map-pinned"
        eyebrow="Por región"
        title="Buscá por la zona del país"
        subtitle="25 regiones curadas. Cada una con su clima, su cultura y los pueblos que la componen."
      >
        <div className="me-region-grid">
          {regionesPub.map((r) => (<RegionCard key={r.slug} region={r} onOpen={onOpenRegion} />))}
        </div>
      </Section>

      <NearbyBlock destinos={trendingPub.slice(0, 4).concat(recientesPub.slice(0, 2))} onOpen={onOpenDestino} />

      <Section
        tone="default"
        eyebrowIcon="flame"
        eyebrow="Tendencia esta semana"
        title="Los pueblos más buscados"
        subtitle="Curado a partir de búsquedas + reservas recientes en toda la red."
        link={{ href: "#", label: "Ver todos" }}
      >
        <div className="me-carousel">
          {trendingPub.map((d) => (<DestinoMiniCard key={d.slug} destino={d} onOpen={onOpenDestino} />))}
        </div>
      </Section>

      <Section
        tone="muted"
        eyebrowIcon="sparkles"
        eyebrow="Recién sumados"
        title="Nuevos destinos en la red"
        subtitle="Pueblos que se sumaron con su responsable local en las últimas semanas."
        link={{ href: "#", label: "Ver todos" }}
      >
        <div className="me-carousel">
          {recientesPub.map((d) => (<DestinoMiniCard key={d.slug} destino={d} onOpen={onOpenDestino} />))}
        </div>
      </Section>

      <BiomaStrip onPick={onOpenBioma} />

      <section style={{ padding: "20px 0 80px" }}>
        <div className="me-container me-container--lg">
          <div className="me-cta-dark">
            <h2>¿Sos comerciante o referente de un destino?</h2>
            <p>
              Cargá tu hospedaje, tu local o tu propuesta gastronómica. La red Mis Escapadas
              te conecta con viajeros que ya están mirando tu pueblo — sin OTAs en el medio.
            </p>
            <a href="#" className="me-btn me-btn--lg">
              Sumar mi propuesta
              <Icon name="arrow-right" size={14} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

window.HubView = HubView;
