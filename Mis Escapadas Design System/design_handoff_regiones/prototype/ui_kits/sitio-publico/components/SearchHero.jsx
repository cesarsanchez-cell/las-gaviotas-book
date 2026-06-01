// SearchHero.jsx — Hero del hub centrado en buscar, no en el wordmark.
// Input grande con autocomplete + 4 pills rápidas + botón "vista mapa".
const { useState: useStateSearch } = React;

function SearchHero({ destinos = [], onPickDestino, onPickBioma, onOpenMap }) {
  const [q, setQ] = useStateSearch("");
  const [focused, setFocused] = useStateSearch(false);

  const matches = q.trim().length >= 2
    ? destinos.filter((d) => d.nombre.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)
    : [];

  return (
    <section className="me-search-hero">
      <div className="me-container me-container--lg">
        <button
          type="button"
          className="me-search-hero__map"
          onClick={onOpenMap}
          title="Ver todos los destinos en el mapa"
        >
          <Icon name="map" size={14} />
          Vista mapa
        </button>

        <header className="me-search-hero__head">
          <p className="me-eyebrow">
            <PinHeart size={14} strokeWidth={2.2} className="me-wm__pin" style={{ verticalAlign: "-2px" }} />
            Mis Escapadas — Red de portales locales
          </p>
          <h1 className="me-search-hero__title">¿A dónde te querés escapar?</h1>
          <p className="me-search-hero__sub">
            Hospedajes verificados por la comunidad de cada destino. Sin intermediarios, sin comisiones.
          </p>
        </header>

        <div className={`me-search-bar ${focused ? "is-focused" : ""}`}>
          <Icon name="search" size={18} style={{ color: "var(--me-fg-muted)" }} />
          <input
            type="search"
            className="me-search-bar__input"
            placeholder="Buscar destino  ·  ej: Las Gaviotas, Bariloche, Cafayate…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            aria-label="Buscar destino"
          />
          {q && (
            <button className="me-search-bar__clear" onClick={() => setQ("")} aria-label="Limpiar">
              <Icon name="x" size={16} />
            </button>
          )}
          {focused && matches.length > 0 && (
            <div className="me-search-bar__dropdown">
              {matches.map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  className="me-search-bar__item"
                  onMouseDown={() => onPickDestino(d.slug)}
                >
                  <PinHeart size={14} strokeWidth={2.2} className="me-wm__pin" />
                  <span>
                    <span className="me-search-bar__nm">{d.nombre}</span>
                    <span className="me-search-bar__rg">{d.region} · {d.pais}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="me-search-hero__pills">
          <button className="me-quickpill" onClick={onPickBioma.bind(null, "near")}>
            <Icon name="locate-fixed" size={14} />Cerca mío
          </button>
          {[
            { k: "playa", label: "Playa" },
            { k: "bosque", label: "Bosque" },
            { k: "sierra", label: "Sierras" },
            { k: "lago", label: "Lago" },
          ].map((b) => {
            const def = BIOMA[b.k];
            return (
              <button key={b.k} className="me-quickpill" onClick={() => onPickBioma(b.k)}>
                <Icon name={def.icon} size={14} />{b.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

window.SearchHero = SearchHero;
