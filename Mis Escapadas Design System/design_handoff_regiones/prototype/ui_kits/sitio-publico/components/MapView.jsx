// MapView.jsx — Vista mapa de Argentina con todos los destinos como pins.
// Tiles Carto Positron (gratis), pin por destino con color del bioma
// dominante, click → sidebar con preview del destino.
const { useEffect: useEffectMap, useRef: useRefMap, useState: useStateMap, useMemo: useMemoMap } = React;

function MapView({ destinos, trending, recientes, onOpenDestino, onGoHub }) {
  const mapRef    = useRefMap(null);
  const mapElRef  = useRefMap(null);
  const layerRef  = useRefMap(null);
  const [selected, setSelected] = useStateMap(null);
  const [biomaFilter, setBiomaFilter] = useStateMap(null);

  // Unimos todas las fuentes de destinos, deduplicadas por slug.
  const allDestinos = useMemoMap(() => {
    const seen = new Set();
    const all = [];
    [...destinos, ...trending, ...recientes].forEach((d) => {
      if (!d.lat || !d.lng || seen.has(d.slug)) return;
      // Sólo destinos publicados (>=1 hospedaje).
      if (window.isDestinoPublicado && !window.isDestinoPublicado(d.slug)) return;
      seen.add(d.slug);
      all.push(d);
    });
    return all;
  }, [destinos, trending, recientes]);

  const filtered = biomaFilter
    ? allDestinos.filter((d) => d.biomas?.includes(biomaFilter))
    : allDestinos;

  // Init map once.
  useEffectMap(() => {
    if (!window.L || !mapElRef.current || mapRef.current) return;
    const map = window.L.map(mapElRef.current, {
      center: [-38.5, -63.6],
      zoom: 4,
      minZoom: 3,
      maxZoom: 14,
      scrollWheelZoom: true,
      zoomControl: false,
    });
    window.L.control.zoom({ position: "bottomright" }).addTo(map);
    window.L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);
    mapRef.current = map;
    layerRef.current = window.L.layerGroup().addTo(map);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Re-render pins on filter change.
  useEffectMap(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !window.L) return;
    layer.clearLayers();
    filtered.forEach((d) => {
      const primary = window.BIOMA[d.biomas?.[0]] || { color: "#28566b", icon: "map-pin" };
      const html = `
        <div class="me-mappin" style="--c:${primary.color}">
          <span class="me-mappin__dot"></span>
          <span class="me-mappin__ring"></span>
        </div>`;
      const icon = window.L.divIcon({
        html,
        className: "me-mappin-icon",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const m = window.L.marker([d.lat, d.lng], { icon, title: d.nombre }).addTo(layer);
      m.on("click", () => setSelected(d));
    });
  }, [filtered]);

  function close() { setSelected(null); }

  return (
    <div className="me-mapview">
      <div className="me-mapview__bar">
        <button className="me-btn me-btn--ghost me-btn--sm" onClick={onGoHub}>
          <Icon name="arrow-left" size={14} />Volver al hub
        </button>
        <div className="me-mapview__title">
          <p className="me-eyebrow"><Icon name="map" size={14} />Vista mapa</p>
          <h2 className="me-mapview__h">{filtered.length} destinos en Argentina</h2>
        </div>
        <div className="me-mapview__filters">
          <button
            className={`me-quickpill ${biomaFilter === null ? "is-active" : ""}`}
            onClick={() => setBiomaFilter(null)}
          >Todos</button>
          {["playa", "bosque", "montana", "sierra", "lago", "desierto"].map((b) => {
            const def = window.BIOMA[b];
            return (
              <button
                key={b}
                className={`me-quickpill ${biomaFilter === b ? "is-active" : ""}`}
                style={biomaFilter === b ? { background: def.color, color: "#fff", borderColor: def.color } : {}}
                onClick={() => setBiomaFilter(biomaFilter === b ? null : b)}
              >
                <Icon name={def.icon} size={12} />{def.label}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={mapElRef} className="me-mapview__map" />

      {selected && (
        <aside className="me-mapview__card">
          <button className="me-mapview__close" onClick={close} aria-label="Cerrar">
            <Icon name="x" size={16} />
          </button>
          <div
            className="me-mapview__photo"
            style={{ background: `linear-gradient(135deg, ${window.BIOMA[selected.biomas[0]].color} 0%, ${window.BIOMA[selected.biomas[1]]?.color || window.BIOMA[selected.biomas[0]].color} 100%)` }}
          >
            <span className="me-mini__glyph" aria-hidden>
              <Icon name={window.BIOMA[selected.biomas[0]].icon} size={84} strokeWidth={1.2} />
            </span>
            <div className="me-mapview__chips">
              {selected.biomas.map((b) => {
                const def = window.BIOMA[b];
                return (
                  <span key={b} className="me-mini__chip" style={{ background: def.color, position: "relative", left: 0, bottom: 0 }}>
                    <Icon name={def.icon} size={10} />{def.label}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="me-mapview__body">
            <p className="me-meta">{selected.region}</p>
            <h3 className="me-mapview__nm">{selected.nombre}</h3>
            <p className="me-meta">{selected.hospedajes_count} hospedajes verificados</p>
            <button className="me-btn me-btn--primary" onClick={() => onOpenDestino(selected.slug)} style={{ marginTop: 14 }}>
              Entrar al destino<Icon name="arrow-right" size={14} />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

window.MapView = MapView;
