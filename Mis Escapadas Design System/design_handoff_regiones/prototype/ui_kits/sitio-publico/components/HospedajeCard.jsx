// HospedajeCard.jsx — coincide con HospedajeCard.tsx del codebase.
function HospedajeCard({ h }) {
  return (
    <a className="me-card me-hcard" href="#">
      <div className="me-hcard__photo">
        <img src={h.photo} alt={h.nombre} />
        <div className="me-hcard__badges">
          {h.destacado && <span className="me-badge me-badge--featured">Destacado</span>}
          <span className="me-badge me-badge--verified">
            <Icon name="shield-check" size={12} />
            Verificado
          </span>
        </div>
      </div>
      <div className="me-hcard__body">
        <div className="me-hcard__title">
          <h3 className="me-hcard__name">{h.nombre}</h3>
          <span className="me-badge me-badge--secondary">{h.tipo}</span>
        </div>
        <p className="me-hcard__desc">{h.descripcion_corta}</p>
        <div className="me-hcard__meta">
          <span><Icon name="map-pin" size={13} />{h.direccion}</span>
          <span><Icon name="users" size={13} />hasta {h.capacidad} personas</span>
          {h.unidades > 1 && (
            <span><Icon name="building-2" size={13} />{h.unidades} unidades</span>
          )}
        </div>
        <div className="me-hcard__amen">
          {h.amenities.map((a) => (
            <span key={a}><Icon name={a} size={12} /></span>
          ))}
        </div>
        <span className="me-btn me-btn--whatsapp me-btn--sm me-hcard__cta">
          <Icon name="message-circle" size={13} />Consultar por WhatsApp
        </span>
      </div>
    </a>
  );
}

window.HospedajeCard = HospedajeCard;
