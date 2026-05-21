// LugarCard.jsx — para atractivos y gastronomía. Coincide con LugarCard.tsx.
function LugarCard({ l }) {
  return (
    <a className="me-card me-lcard" href="#">
      <div className="me-lcard__photo">
        <img src={l.photo} alt={l.nombre} />
        <div className="me-hcard__badges">
          {l.imperdible && (
            <span className="me-badge me-badge--featured">
              <Icon name="sparkles" size={12} />Imperdible
            </span>
          )}
        </div>
      </div>
      <div className="me-hcard__body">
        <div className="me-hcard__title">
          <h3 className="me-hcard__name">{l.nombre}</h3>
          {l.categoria && <span className="me-badge me-badge--secondary">{l.categoria}</span>}
        </div>
        <p className="me-hcard__desc">{l.descripcion_corta}</p>
        {l.direccion && (
          <div className="me-hcard__meta">
            <span><Icon name="map-pin" size={13} />{l.direccion}</span>
          </div>
        )}
        <span className="me-lcard__link">Ver detalle →</span>
      </div>
    </a>
  );
}

window.LugarCard = LugarCard;
