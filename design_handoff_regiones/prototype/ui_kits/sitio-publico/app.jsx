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
  // "#mapa" → {view:"mapa"}
  // anything else → {view:"hub"}
  const h = window.location.hash.replace(/^#/, "");
  if (h === "mapa") return { view: "mapa" };
  if (h.startsWith("destino:")) {
    const slug = h.slice("destino:".length);
    if (MOCK.destinos.some((d) => d.slug === slug)) return { view: "destino", slug };
  }
  return { view: "hub" };
}

function App() {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useState(false);
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
    // Por ahora — sin vista de región: scroll a esa sección + mensaje.
    alert(`Vista de región "${slug}" — la armamos en el próximo paso.`);
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

  const isHub  = route.view === "hub";
  const isMapa = route.view === "mapa";
  const data   = isHub || isMapa ? null : getDestinoData(route.slug);

  return (
    <>
      {!isMapa && (
        <Header
          mode={isHub ? "hub" : "destino"}
          destinoNombre={data?.destino?.nombre}
          onGoHub={goHub}
        />
      )}

      {isMapa ? (
        <MapView
          destinos={MOCK.destinos}
          trending={MOCK.trending}
          recientes={MOCK.recientes}
          onOpenDestino={openDestino}
          onGoHub={goHub}
        />
      ) : isHub ? (
        <main>
          <HubView
            destinos={MOCK.destinos}
            regiones={MOCK.regiones}
            trending={MOCK.trending}
            recientes={MOCK.recientes}
            onOpenDestino={openDestino}
            onOpenRegion={openRegion}
            onOpenBioma={openBioma}
            onOpenMap={openMap}
          />
        </main>
      ) : (
        <DestinoView data={data} tweaks={tweaks} />
      )}

      <Footer />

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

function DestinoView({ data, tweaks }) {
  const { destino, hospedajes, imperdibles, gastronomia } = data;
  return (
    <main>
      <Hero destino={destino} />
      {tweaks.showWeather && <DestinoStrip destino={destino} />}

      {imperdibles.length > 0 && (
        <Section
          id="atractivos"
          tone="default"
          dark
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

      {hospedajes.length > 0 && (
        <Section
          id="hospedajes"
          tone="default"
          eyebrowIcon="building-2"
          eyebrow="Hospedajes"
          title={`Destacados de ${destino.nombre}`}
          subtitle="Selección curada de la comunidad. Contacto directo al responsable, sin comisiones."
          link={{ href: "#", label: "Ver todos los hospedajes" }}
        >
          <div className="me-grid">
            {hospedajes.map((h) => (<HospedajeCard key={h.slug} h={h} />))}
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
          link={{ href: "#", label: "Gastronomía" }}
        >
          <div className="me-grid">
            {gastronomia.map((l) => (<LugarCard key={l.slug} l={l} />))}
          </div>
        </Section>
      )}

      <section style={{ padding: "20px 0 80px" }}>
        <div className="me-container me-container--lg">
          <div className="me-cta-dark">
            <h2>¿Buscás dónde quedarte?</h2>
            <p>Hospedajes verificados con contacto directo al responsable. Sin intermediarios, sin comisiones.</p>
            <a href="#hospedajes" className="me-btn me-btn--lg">
              Explorar hospedajes
              <Icon name="arrow-right" size={14} />
            </a>
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
