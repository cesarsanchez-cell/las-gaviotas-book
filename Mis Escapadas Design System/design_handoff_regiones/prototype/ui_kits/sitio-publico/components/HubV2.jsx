// HubV2.jsx — Hub home estilo Airbnb.
//   Verticales (3): Hospedajes · Gastronomía · Qué hacer.
//   El buscador maneja selectores independientes (dónde / cuándo / quién,
//   cada uno opcional). Reglas:
//     · Si hay "dónde" (destino o región) → banda de PROMOS de ese lugar
//       arriba + grilla del vertical filtrada a ese lugar.
//     · Si NO hay "dónde" → geoposición: banda "Cerca tuyo" con destinos
//       cercanos + grilla del vertical con todo lo publicado.
const { useState: useStateHV, useMemo: useMemoHV, useEffect: useEffectHV } = React;

const TITLE = {
  hospedajes:   "Hospedajes verificados",
  gastronomia:  "Mesa local",
  atractivos:   "Qué hacer",
};
const LBL = {
  hospedajes:   "hospedajes",
  gastronomia:  "lugares para comer",
  atractivos:   "actividades",
};

function HubV2({ destinos, regiones, onOpenDestino, onOpenRegion, onSumarPropuesta }) {
  const [vertical, setVertical] = useStateHV("hospedajes");
  const [search, setSearch]     = useStateHV({ donde: "", cuando: "", quien: "" });
  const [searchOpen, setSearchOpen] = useStateHV(false);
  const [regionFilter, setRegionFilter] = useStateHV(null);
  const [geo, setGeo] = useStateHV("idle"); // idle · granted · denied

  const hasDonde = Boolean(search.donde);

  // ¿El "dónde" matchea un destino concreto? (para banda de promos)
  const dondeDestinos = useMemoHV(() => {
    if (!hasDonde) return [];
    const q = search.donde.toLowerCase();
    return (window.getPublishedDestinos?.() || destinos).filter((d) =>
      d.nombre.toLowerCase().includes(q) ||
      d.region?.toLowerCase().includes(q) ||
      d.pais?.toLowerCase().includes(q)
    );
  }, [hasDonde, search.donde, destinos]);

  // Promos de los destinos del "dónde".
  const promos = useMemoHV(() => {
    if (!hasDonde) return [];
    const slugs = new Set(dondeDestinos.map((d) => d.slug));
    return (window.getAllPromos?.() || []).filter((p) => slugs.has(p._destino.slug));
  }, [hasDonde, dondeDestinos]);

  // Grilla del vertical, filtrada por dónde / región.
  const items = useMemoHV(() => {
    let all = window.getAllByVertical(vertical);
    if (regionFilter) {
      const region = regiones.find((r) => r.slug === regionFilter);
      const dset = new Set(region?.destinos_slugs || []);
      all = all.filter((it) => dset.has(it._destino.slug));
    }
    if (hasDonde) {
      const slugs = new Set(dondeDestinos.map((d) => d.slug));
      all = all.filter((it) => slugs.has(it._destino.slug));
    }
    return all;
  }, [vertical, regionFilter, hasDonde, dondeDestinos, regiones]);

  // Sin "dónde": pedir geoposición para mostrar cercanos.
  function askGeo() {
    if (!navigator.geolocation) { setGeo("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      () => setGeo("granted"),
      () => setGeo("denied"),
      { timeout: 8000 }
    );
  }

  const nearbyDestinos = useMemoHV(
    () => (window.getPublishedDestinos?.() || destinos).slice(0, 6),
    [destinos]
  );

  // Promos destacadas (pantalla de inicio, sin "dónde"): las más atractivas
  // de cada lugar. Hasta 2 por destino, ordenadas por descuento.
  const promosDestacadas = useMemoHV(() => {
    const all = window.getAllPromos?.() || [];
    const byDestino = {};
    all.forEach((p) => { (byDestino[p._destino.slug] = byDestino[p._destino.slug] || []).push(p); });
    const out = [];
    Object.values(byDestino).forEach((list) => {
      list.sort((a, b) => ((b.ahorro_pct || b.pct || 0) - (a.ahorro_pct || a.pct || 0)))
          .slice(0, 2).forEach((p) => out.push(p));
    });
    return out.sort((a, b) => ((b.ahorro_pct || b.pct || 0) - (a.ahorro_pct || a.pct || 0)));
  }, []);

  const regionesPub = (window.getPublishedRegiones?.() || regiones).filter(Boolean);

  return (
    <>
      <AirbnbTop
        vertical={vertical}
        onChangeVertical={(v) => { setVertical(v); window.__meVertical = v; }}
        onGoHub={() => { setVertical("hospedajes"); setRegionFilter(null); setSearch({ donde: "", cuando: "", quien: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        search={search}
        onChangeSearch={setSearch}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        search={search}
        onApply={setSearch}
        destinos={destinos}
        regiones={regiones}
        vertical={vertical}
        onUseGeo={askGeo}
      />

      <main className="me-hv2">
        {/* ── Banda contextual: promos del destino, destacadas, o cercanos ── */}
        {hasDonde ? (
          promos.length > 0 && (
            <section className="me-hv2__band">
              <header className="me-hv2__band-head">
                <p className="me-eyebrow"><Icon name="tag" size={14} />Promos en {search.donde}</p>
                <h2 className="me-hv2__band-title">Lo que conviene ahora</h2>
              </header>
              <div className="me-hv2__band-track">
                {promos.map((p) => (
                  <PromoCard key={`${p._kind}-${p.slug}`} promo={p} onOpen={() => onOpenDestino(p._destino.slug)} />
                ))}
              </div>
            </section>
          )
        ) : geo === "granted" ? (
          <section className="me-hv2__band">
            <header className="me-hv2__band-head">
              <p className="me-eyebrow"><Icon name="locate-fixed" size={14} />Cerca tuyo</p>
              <h2 className="me-hv2__band-title">Escapadas a pocas horas</h2>
            </header>
            <div className="me-hv2__band-track">
              {nearbyDestinos.map((d) => (
                <NearbyMini key={d.slug} destino={d} onOpen={() => onOpenDestino(d.slug)} />
              ))}
            </div>
          </section>
        ) : (
          promosDestacadas.length > 0 && (
            <section className="me-hv2__band">
              <header className="me-hv2__band-head">
                <p className="me-eyebrow"><Icon name="tag" size={14} />Promos destacadas</p>
                <h2 className="me-hv2__band-title">Lo mejor de cada lugar</h2>
              </header>
              <div className="me-hv2__band-track">
                {promosDestacadas.map((p) => (
                  <PromoCard key={`${p._kind}-${p.slug}`} promo={p} onOpen={() => onOpenDestino(p._destino.slug)} />
                ))}
              </div>
            </section>
          )
        )}

        {/* ── Filtros de región ── */}
        {regionesPub.length > 1 && (
          <div className="me-region-chips" role="tablist" aria-label="Filtrar por región">
            <button type="button" className={`me-region-chip ${!regionFilter ? "is-active" : ""}`}
                    onClick={() => setRegionFilter(null)} role="tab" aria-selected={!regionFilter}>
              Todas las regiones
            </button>
            {regionesPub.map((r) => (
              <button key={r.slug} type="button" className={`me-region-chip ${regionFilter === r.slug ? "is-active" : ""}`}
                      onClick={() => setRegionFilter(regionFilter === r.slug ? null : r.slug)} role="tab" aria-selected={regionFilter === r.slug}>
                {r.nombre}
              </button>
            ))}
          </div>
        )}

        {/* ── Grilla del vertical activo ── */}
        <section className="me-hv2__sec">
          <header className="me-hv2__sec-head">
            <h2 className="me-hv2__sec-title">{TITLE[vertical]}{hasDonde ? ` en ${search.donde}` : ""}</h2>
            <span className="me-hv2__sec-count me-meta">{items.length} resultados</span>
          </header>

          {items.length === 0 ? (
            <div className="me-empty">
              <Icon name="map-pin-off" size={24} />
              <p>No encontramos {LBL[vertical]} con ese criterio.</p>
              <button className="me-btn me-btn--outline me-btn--sm" onClick={() => { setRegionFilter(null); setSearch({ donde: "", cuando: "", quien: "" }); }}>
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="me-hv2__grid me-hv2__grid--small">
              {items.map((it) => (
                <ItemCard key={`${it._vertical}-${it.slug}`} item={it} onOpen={() => onOpenDestino(it._destino.slug)} />
              ))}
            </div>
          )}
        </section>

        {/* ── CTA comerciante → login responsables (compacto) ── */}
        <section className="me-hv2__cta">
          <div className="me-join">
            <span className="me-join__ic"><Icon name="store" size={16} /></span>
            <p className="me-join__txt">¿Tenés un hospedaje, restaurante o atractivo? Sumalo a la red.</p>
            <button type="button" className="me-btn me-btn--outline me-btn--sm me-join__btn" onClick={onSumarPropuesta}>
              Sumar mi propuesta<Icon name="arrow-right" size={13} />
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

function ItemCard({ item, onOpen }) {
  const ICONS = { hospedajes: "bed-double", gastronomia: "utensils-crossed", atractivos: "compass" };
  const TIPO_LBL = {
    hospedajes: item.tipo || "Hospedaje",
    gastronomia: item.categoria || "Lugar",
    atractivos: item.categoria || "Atractivo",
  };
  return (
    <article className="me-itemcard me-itemcard--small" onClick={onOpen} role="button" tabIndex="0">
      <div className="me-itemcard__photo">
        {item.photo ? (
          <img src={item.photo} alt="" loading="lazy" />
        ) : (
          <Icon name={ICONS[item._vertical]} size={28} />
        )}
        {item.destacado && (
          <span className="me-itemcard__badge">
            <Icon name="sparkles" size={10} />Destacado
          </span>
        )}
        <button type="button" className="me-itemcard__heart" onClick={(e) => { e.stopPropagation(); e.currentTarget.classList.toggle("is-on"); }} aria-label="Guardar">
          <Icon name="heart" size={14} />
        </button>
      </div>
      <div className="me-itemcard__body">
        <div className="me-itemcard__hd">
          <h3 className="me-itemcard__nm">{item.nombre}</h3>
        </div>
        <span className="me-itemcard__loc me-meta">
          <Icon name="map-pin" size={11} />{item._destino.nombre}
        </span>
        <p className="me-meta me-itemcard__tipo">{TIPO_LBL[item._vertical]}</p>
      </div>
    </article>
  );
}

function NearbyMini({ destino, onOpen }) {
  const primary = window.BIOMA[destino.biomas?.[0]] || { color: "#28566b", icon: "map-pin", label: "" };
  return (
    <article className="me-itemcard me-itemcard--small" onClick={onOpen} role="button" tabIndex="0">
      <div className="me-itemcard__photo" style={{ background: `linear-gradient(135deg, ${primary.color}, ${window.BIOMA[destino.biomas?.[1]]?.color || primary.color})` }}>
        <Icon name={primary.icon} size={28} style={{ color: "hsl(0 0% 100% / 0.9)" }} />
        <span className="me-itemcard__badge">{destino.hospedajes_count ?? ""} hosp.</span>
      </div>
      <div className="me-itemcard__body">
        <div className="me-itemcard__hd"><h3 className="me-itemcard__nm">{destino.nombre}</h3></div>
        <span className="me-itemcard__loc me-meta"><Icon name="map-pin" size={11} />{destino.region}</span>
      </div>
    </article>
  );
}

function PromoCard({ promo, onOpen }) {
  const isSinergia = promo._kind === "sinergia";
  const photo = isSinergia ? promo.photos?.hero : promo.photo;
  const titulo = promo.titulo;
  const bajada = promo.bajada;
  const pct    = isSinergia ? promo.ahorro_pct : promo.pct;

  return (
    <article className="me-itemcard me-itemcard--small me-promocard" onClick={onOpen} role="button" tabIndex="0">
      <div className="me-itemcard__photo">
        {photo ? <img src={photo} alt="" loading="lazy" /> : <Icon name="tag" size={28} />}
        <span className={`me-promocard__kind me-promocard__kind--${promo._kind}`}>
          <Icon name={isSinergia ? "link-2" : "tag"} size={10} />
          {isSinergia ? "Sinergia" : "Promo"}
        </span>
        {pct && <span className="me-promocard__pct">-{pct}%</span>}
        <button type="button" className="me-itemcard__heart" onClick={(e) => { e.stopPropagation(); e.currentTarget.classList.toggle("is-on"); }} aria-label="Guardar">
          <Icon name="heart" size={14} />
        </button>
      </div>
      <div className="me-itemcard__body">
        <div className="me-itemcard__hd">
          <h3 className="me-itemcard__nm">{titulo}</h3>
        </div>
        <span className="me-itemcard__loc me-meta">
          <Icon name="map-pin" size={11} />{promo._destino.nombre}
        </span>
        <p className="me-itemcard__desc">{bajada}</p>
      </div>
    </article>
  );
}

window.HubV2 = HubV2;
