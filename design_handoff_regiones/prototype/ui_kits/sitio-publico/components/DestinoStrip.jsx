// DestinoStrip.jsx — strip con weather + bioma + map + transport.
// Vive justo debajo del hero, antes de los listados.
function DestinoStrip({ destino }) {
  return (
    <section className="me-strip" aria-label="Información del destino">
      <div className="me-container">
        <header className="me-strip__head">
          <p className="me-eyebrow">{destino.nombre} en un vistazo</p>
          <h2 className="me-strip__title">Cómo está, qué tiene y cómo llegás</h2>
        </header>
        <div className="me-strip__grid">
          <WeatherModule destino={destino.nombre} weather={destino.weather} />
          <BiomaChips biomas={destino.biomas} destino={destino.nombre} />
          <MapModule map={destino.map} />
          <TransportModule transporte={destino.transporte} />
        </div>
      </div>
    </section>
  );
}

window.DestinoStrip = DestinoStrip;
