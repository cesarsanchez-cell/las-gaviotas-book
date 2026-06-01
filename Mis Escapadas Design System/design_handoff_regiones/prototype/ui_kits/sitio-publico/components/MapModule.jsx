// MapModule.jsx — mini-mapa estilizado con pin pulsante.
function MapModule({ map }) {
  return (
    <article className="me-card me-mod me-mod--map" aria-label="Ubicación">
      <div className="me-map__canvas" role="img" aria-label={`Mapa de ${map.label}`}>
        <svg className="me-map__roads" viewBox="0 0 600 240" preserveAspectRatio="none">
          <path d="M -10 180 C 120 140 220 130 280 100 C 360 60 420 110 620 80" />
          <path d="M 40 60 C 150 80 230 140 320 150 C 420 160 520 150 620 140" style={{ strokeWidth: 2, opacity: 0.55 }} />
          <path d="M 100 220 C 240 200 320 210 420 200 C 500 192 580 200 620 198" style={{ strokeWidth: 1.8, opacity: 0.4 }} />
        </svg>
        <span className="me-map__pulse" aria-hidden />
        <span className="me-map__pin" aria-hidden>
          <Icon name="map-pin" size={14} style={{ transform: "rotate(45deg)", color: "#fff" }} />
        </span>
      </div>
      <div className="me-map__foot">
        <div>
          <p className="me-map__name">{map.label}</p>
          <p className="me-meta">Centro del destino · plaza Brown</p>
        </div>
        <a className="me-map__cta" href={map.mapsUrl} target="_blank" rel="noreferrer">
          Abrir en Maps <Icon name="external-link" size={13} />
        </a>
      </div>
    </article>
  );
}

window.MapModule = MapModule;
