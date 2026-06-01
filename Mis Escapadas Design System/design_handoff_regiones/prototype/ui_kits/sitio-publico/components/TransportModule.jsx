// TransportModule.jsx — opciones de cómo llegar.
function TransportModule({ transporte, origen = "Buenos Aires" }) {
  return (
    <article className="me-card me-mod me-mod--transport" aria-label="Cómo llegar">
      <div className="me-mod__hd">
        <span className="me-mod__lbl">Cómo llegar</span>
        <span className="me-mod__hint">desde {origen}</span>
      </div>
      <div className="me-transport__list">
        {transporte.map((t) => (
          <button key={t.mode} type="button" className="me-transport__row">
            <span className="me-transport__ic">
              <Icon name={t.icon} size={18} />
            </span>
            <span className="me-transport__nm">
              <span className="mode">{t.mode}</span>
              <span className="det">{t.det}</span>
            </span>
            <span className="me-transport__t">{t.time}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

window.TransportModule = TransportModule;
