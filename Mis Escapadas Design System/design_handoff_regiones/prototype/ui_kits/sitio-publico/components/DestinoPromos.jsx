// DestinoPromos.jsx — banda de promos dentro de un destino. Muestra las
// promos INDIVIDUALES filtradas por la vertical elegida (la que el viajero
// venía mirando en el hub) + las SINERGIAS (combos curados) que contienen
// esa vertical. Un toggle permite cambiar de vertical sin salir.
const { useState: useStateDP, useMemo: useMemoDP } = React;

const VERT_TABS = [
  { key: "hospedajes",  label: "Hospedajes",  icon: "bed-double",        tipo: "hospedaje" },
  { key: "gastronomia", label: "Gastronomía", icon: "utensils-crossed",  tipo: "gastronomia" },
  { key: "atractivos",  label: "Qué hacer",   icon: "compass",           tipo: "atractivo" },
];

function DestinoPromos({ destino, promosIndividuales, combos, onOpenCombo }) {
  const initial = window.__meVertical && VERT_TABS.some((v) => v.key === window.__meVertical)
    ? window.__meVertical : "hospedajes";
  const [vert, setVert] = useStateDP(initial);
  const tipoActivo = VERT_TABS.find((v) => v.key === vert)?.tipo;

  // Individuales de esta vertical.
  const individuales = useMemoDP(
    () => (promosIndividuales || []).filter((p) => p.tipo === tipoActivo),
    [promosIndividuales, tipoActivo]
  );

  // Sinergias que CONTIENEN esta vertical (alguno de sus chips es del tipo).
  const sinergias = useMemoDP(
    () => (combos || []).filter((c) => c.chips?.some((ch) => ch.type === tipoActivo)),
    [combos, tipoActivo]
  );

  const total = individuales.length + sinergias.length;
  if ((promosIndividuales || []).length === 0 && (combos || []).length === 0) return null;

  return (
    <section className="me-section me-dpromos" id="promos" aria-labelledby="dpromos-title">
      <div className="me-container">
        <header className="me-section__head">
          <div className="me-section__lead">
            <p className="me-eyebrow"><Icon name="tag" size={14} />Promos en {destino}</p>
            <h2 id="dpromos-title" className="me-section__title">Lo que conviene ahora</h2>
            <p className="me-section__sub">Beneficios sobre un comercio y combos de varios — elegí la categoría.</p>
          </div>
        </header>

        {/* Toggle de vertical */}
        <div className="me-dpromos__tabs" role="tablist">
          {VERT_TABS.map((v) => (
            <button key={v.key} type="button" role="tab" aria-selected={vert === v.key}
                    className={`me-dpromos__tab ${vert === v.key ? "is-active" : ""}`}
                    onClick={() => setVert(v.key)}>
              <Icon name={v.icon} size={15} />{v.label}
            </button>
          ))}
        </div>

        {total === 0 ? (
          <div className="me-empty">
            <Icon name="tag" size={22} />
            <p>Todavía no hay promos de {VERT_TABS.find((v) => v.key === vert)?.label.toLowerCase()} en {destino}.</p>
          </div>
        ) : (
          <div className="me-dpromos__grid">
            {sinergias.map((c) => (
              <article key={`s-${c.slug}`} className="me-itemcard me-itemcard--small me-promocard" onClick={() => onOpenCombo?.(c)} role="button" tabIndex="0">
                <div className="me-itemcard__photo">
                  {c.photos?.hero ? <img src={c.photos.hero} alt="" loading="lazy" /> : <Icon name="link-2" size={26} />}
                  <span className="me-promocard__kind me-promocard__kind--sinergia"><Icon name="link-2" size={10} />Sinergia</span>
                  {c.ahorro_pct && <span className="me-promocard__pct">-{c.ahorro_pct}%</span>}
                </div>
                <div className="me-itemcard__body">
                  <div className="me-itemcard__hd"><h3 className="me-itemcard__nm">{c.titulo}</h3></div>
                  <p className="me-itemcard__desc">{c.bajada}</p>
                </div>
              </article>
            ))}
            {individuales.map((p) => (
              <article key={`i-${p.slug}`} className="me-itemcard me-itemcard--small me-promocard" role="button" tabIndex="0">
                <div className="me-itemcard__photo">
                  {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : <Icon name="tag" size={26} />}
                  <span className="me-promocard__kind me-promocard__kind--individual"><Icon name="tag" size={10} />Promo</span>
                  {p.pct && <span className="me-promocard__pct">-{p.pct}%</span>}
                </div>
                <div className="me-itemcard__body">
                  <div className="me-itemcard__hd"><h3 className="me-itemcard__nm">{p.titulo}</h3></div>
                  <p className="me-itemcard__desc">{p.bajada}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

window.DestinoPromos = DestinoPromos;
