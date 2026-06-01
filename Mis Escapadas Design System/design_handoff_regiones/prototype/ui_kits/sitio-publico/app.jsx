// app.jsx — Routes between hub (all destinations) and a specific destino.
// State is held in URL hash so reload doesn't lose your place.

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showWeather": true,
  "anims": true,
  "startView": "hub"
}/*EDITMODE-END*/;

function parseHash() {
  // "#destino:las-gaviotas" → {view:"destino", slug:"las-gaviotas"}
  // "#armar:las-gaviotas"  → {view:"armar",   slug:"las-gaviotas"}
  // "#mapa"                → {view:"mapa"}
  // anything else          → {view:"hub"}
  const h = window.location.hash.replace(/^#/, "");
  if (h === "mapa") return { view: "mapa" };
  if (h.startsWith("destino:")) {
    const slug = h.slice("destino:".length);
    if (MOCK.destinos.some((d) => d.slug === slug)) return { view: "destino", slug };
  }
  if (h.startsWith("armar:")) {
    const slug = h.slice("armar:".length);
    if (MOCK.destinos.some((d) => d.slug === slug)) return { view: "armar", slug };
  }
  return { view: "hub" };
}

function App() {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [openCombo, setOpenCombo] = useState(null);
  const [route, setRoute] = useState(() => {
    const r = parseHash();
    // Honor startView tweak only if there's no explicit hash.
    if (!window.location.hash && tweaks.startView === "las-gaviotas") {
      return { view: "destino", slug: "las-gaviotas" };
    }
    return r;
  });

  // Tweak protocol
  useEffect(() => {
    const onMsg = (e) => {
      const d = e?.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "__activate_edit_mode") setTweaksOpen(true);
      if (d.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent?.postMessage?.({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // URL hash sync
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function setTweak(k, v) {
    const edits = typeof k === "string" ? { [k]: v } : k;
    setTweaks((t) => ({ ...t, ...edits }));
    window.parent?.postMessage?.({ type: "__edit_mode_set_keys", edits }, "*");
  }

  // Apply anims toggle
  useEffect(() => {
    if (!tweaks.anims) document.body.classList.add("anims-off");
    else document.body.classList.remove("anims-off");
  }, [tweaks.anims]);

  function openDestino(slug) {
    window.location.hash = `destino:${slug}`;
    window.scrollTo(0, 0);
  }
  function goHub() {
    window.location.hash = "";
    window.scrollTo(0, 0);
  }
  function openRegion(slug) {
    // Skip rule: si la región tiene 1 solo destino publicado, vamos directo.
    const destinos = window.getDestinosDeRegion?.(slug) || [];
    if (destinos.length === 1) { openDestino(destinos[0].slug); return; }
    // Página de región — pendiente de diseño.
    alert(`Vista de región "${slug}" (${destinos.length} destinos) — la armamos en el próximo paso.`);
  }
  function openBioma(slug) {
    if (slug === "near") {
      alert("Activá la geolocalización en la sección 'Cerca tuyo' para ver destinos cercanos.");
      return;
    }
    alert(`Filtro por bioma "${slug}" — lista filtrada se arma en el próximo paso.`);
  }
  function openMap() {
    window.location.hash = "mapa";
    window.scrollTo(0, 0);
  }
  function openArmador(slug) {
    window.location.hash = `armar:${slug}`;
    window.scrollTo(0, 0);
  }
  function backToDestino() {
    if (route.slug) {
      window.location.hash = `destino:${route.slug}`;
    } else {
      window.location.hash = "";
    }
    window.scrollTo(0, 0);
  }

  const isHub    = route.view === "hub";
  const isMapa   = route.view === "mapa";
  const isArmar  = route.view === "armar";
  const data     = isHub || isMapa ? null : getDestinoData(route.slug);

  return (
    <>
      {!isMapa && !isArmar && (
        // Header solo se muestra en vista destino. El hub tiene su propio AirbnbTop.
        !isHub && (
          <Header
            mode="destino"
            destinoNombre={data?.destino?.nombre}
            onGoHub={goHub}
          />
        )
      )}

      {isMapa ? (
        <MapView
          destinos={MOCK.destinos}
          trending={MOCK.trending}
          recientes={MOCK.recientes}
          onOpenDestino={openDestino}
          onGoHub={goHub}
        />
      ) : isArmar ? (
        <ArmadorView
          destino={data.destino}
          hospedajes={data.hospedajes}
          gastronomia={data.gastronomia}
          atractivos={data.imperdibles}
          crossPromos={data.crossPromos}
          onClose={backToDestino}
        />
      ) : isHub ? (
        <main>
          {/* Reglas de red: 0 destinos → mensaje; 1 destino → redirige. */}
          {(() => {
            const pub = window.getPublishedDestinos?.() || MOCK.destinos;
            if (pub.length === 0) {
              return (
                <section className="me-section me-section--default" style={{ minHeight: "50vh", display: "flex", alignItems: "center" }}>
                  <div className="me-container me-container--lg" style={{ textAlign: "center" }}>
                    <p className="me-eyebrow">Mis Escapadas</p>
                    <h2 className="me-section__title">Estamos preparando los primeros destinos.</h2>
                    <p className="me-section__sub">Volvé pronto — pronto vas a encontrar acá lo mejor de cada zona.</p>
                  </div>
                </section>
              );
            }
            if (pub.length === 1) {
              setTimeout(() => openDestino(pub[0].slug), 0);
              return null;
            }
            return (
              <HubV2
                destinos={MOCK.destinos}
                regiones={MOCK.regiones}
                onOpenDestino={openDestino}
                onOpenRegion={openRegion}
                onSumarPropuesta={() => { window.location.hash = "responsables-login"; }}
              />
            );
          })()}
        </main>
      ) : (
        // Reglas del destino: si las 3 listas están vacías, mostrar "Próximamente".
        (data?.hospedajes.length + data?.imperdibles.length + data?.gastronomia.length === 0) ? (
          <main className="me-destino">
            <section className="me-section" style={{ minHeight: "50vh", display: "flex", alignItems: "center" }}>
              <div className="me-container me-container--lg" style={{ textAlign: "center" }}>
                <p className="me-eyebrow">{data.destino.region} · {data.destino.pais}</p>
                <h2 className="me-section__title">Todavía estamos cargando contenido de {data.destino.nombre}.</h2>
                <p className="me-section__sub">Volvé pronto — pronto vas a encontrar acá lo mejor del destino.</p>
                <div style={{ marginTop: 24 }}>
                  <button className="me-btn me-btn--primary" onClick={goHub}>
                    Volver al hub<Icon name="arrow-right" size={14} />
                  </button>
                </div>
              </div>
            </section>
          </main>
        ) : (
          <DestinoView
            data={data}
            tweaks={tweaks}
            onOpenCombo={(c) => setOpenCombo(c)}
            onOpenArmador={() => openArmador(route.slug)}
          />
        )
      )}

      {!isArmar && <Footer />}

      {openCombo && data && (
        <ComboDetailModal
          combo={openCombo}
          destino={data.destino.nombre}
          hospedajes={data.hospedajes}
          gastronomia={data.gastronomia}
          imperdibles={data.imperdibles}
          onClose={() => setOpenCombo(null)}
        />
      )}

      <TweaksPanel
        open={tweaksOpen}
        tweaks={tweaks}
        setTweak={setTweak}
        destinos={MOCK.destinos}
        currentView={route.view}
        onOpenDestino={openDestino}
        onGoHub={goHub}
        onClose={() => {
          setTweaksOpen(false);
          window.parent?.postMessage?.({ type: "__edit_mode_dismissed" }, "*");
        }}
      />
    </>
  );
}

function DestinoView({ data, tweaks, onOpenCombo, onOpenArmador }) {
  const { destino, hospedajes, imperdibles, gastronomia, combos } = data;
  function goBuscar() {
    document.getElementById("hospedajes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <main className="me-destino">
      <HeroCarousel
        destino={destino}
        imperdibles={imperdibles}
        hospedajes={hospedajes}
        gastronomia={gastronomia}
        onSearch={goBuscar}
      />

      {tweaks.showWeather && <DestinoStrip destino={destino} />}

      <DestinoPromos
        destino={destino.nombre}
        promosIndividuales={data.promosIndividuales}
        combos={combos}
        onOpenCombo={onOpenCombo}
      />

      <CombosSection
        destino={destino.nombre}
        combos={combos}
        onOpenCombo={onOpenCombo}
        onOpenArmador={onOpenArmador}
      />

      {imperdibles.length > 0 && (
        <Section
          id="atractivos"
          tone="default"
          eyebrowIcon="sparkles"
          eyebrow="Imperdibles"
          title={`Lo que no te podés perder en ${destino.nombre}`}
          subtitle="Selección curada por la comunidad local. Lugares que la gente vuelve a recomendar año tras año."
        >
          <div className="me-grid">
            {imperdibles.map((l) => (<LugarCard key={l.slug} l={l} />))}
          </div>
        </Section>
      )}

      {gastronomia.length > 0 && (
        <Section
          id="gastronomia"
          tone="muted"
          eyebrowIcon="utensils"
          eyebrow="Para hacer y comer"
          title={`Vida local en ${destino.nombre}`}
          subtitle="Bares, restaurantes y los lugares que la comunidad recomienda."
          link={{ href: "#", label: "Toda la gastronomía" }}
        >
          <div className="me-grid">
            {gastronomia.map((l) => (<LugarCard key={l.slug} l={l} />))}
          </div>
        </Section>
      )}

      {hospedajes.length > 0 && (
        <Section
          id="hospedajes"
          tone="default"
          eyebrowIcon="building-2"
          eyebrow="Dónde quedarte"
          title={`Hospedajes en ${destino.nombre}`}
          subtitle="Contacto directo al responsable, sin comisiones. Todos verificados por la comunidad local."
          link={{ href: "#", label: "Ver todos los hospedajes" }}
        >
          <div className="me-grid">
            {hospedajes.map((h) => (<HospedajeCard key={h.slug} h={h} />))}
          </div>
        </Section>
      )}

      <section className="me-destino__cta">
        <div className="me-container me-container--lg">
          <div className="me-cta-dark">
            <h2>¿Tenés fechas?</h2>
            <p>Mostrame qué hospedajes tienen disponibilidad en {destino.nombre} para tus días.</p>
            <button onClick={goBuscar} className="me-btn me-btn--lg">
              Buscar disponibilidad
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function TweaksPanel({ open, tweaks, setTweak, destinos, currentView, onOpenDestino, onGoHub, onClose }) {
  return (
    <div className={`tweaks ${open ? "active" : ""}`}>
      <button className="tweaks-close" onClick={onClose} aria-label="Cerrar">
        <Icon name="x" size={16} />
      </button>
      <h4>Tweaks</h4>

      <div>
        <label style={{ paddingTop: 0 }}><span>Vista</span></label>
        <div className="row">
          <button className={currentView === "hub" ? "active" : ""} onClick={onGoHub}>Hub</button>
          {destinos.map((d) => (
            <button
              key={d.slug}
              className={currentView === "destino" && window.location.hash === `#destino:${d.slug}` ? "active" : ""}
              onClick={() => onOpenDestino(d.slug)}
            >
              {d.nombre}
            </button>
          ))}
        </div>
      </div>

      <label style={{ marginTop: 10 }}>
        <span>Mostrar strip de destino</span>
        <input type="checkbox" checked={tweaks.showWeather} onChange={(e) => setTweak("showWeather", e.target.checked)} />
      </label>
      <label>
        <span>Animaciones</span>
        <input type="checkbox" checked={tweaks.anims} onChange={(e) => setTweak("anims", e.target.checked)} />
      </label>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
