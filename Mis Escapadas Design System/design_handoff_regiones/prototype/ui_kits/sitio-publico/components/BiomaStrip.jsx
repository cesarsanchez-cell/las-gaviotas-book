// BiomaStrip.jsx — strip horizontal de chips grandes con cada bioma como
// filtro transversal. Click → entra a la lista filtrada por ese bioma
// (mock: por ahora solo cambia el hash).
function BiomaStrip({ onPick }) {
  const allBiomas = ["playa", "bosque", "montana", "sierra", "lago", "desierto"];
  return (
    <section className="me-section me-section--sand">
      <div className="me-container">
        <header className="me-section__head">
          <div className="me-section__lead">
            <p className="me-eyebrow"><Icon name="layers" size={14} />Explorá por bioma</p>
            <h2 className="me-section__title">El paisaje al que querés ir</h2>
            <p className="me-section__sub">
              Filtro transversal — no importa la región, te muestra solo destinos donde
              el bioma que elegís es la particularidad de la zona.
            </p>
          </div>
        </header>
        <div className="me-bioma-strip">
          {allBiomas.map((b) => {
            const def = BIOMA[b];
            return (
              <button
                key={b}
                className="me-bioma-big"
                style={{ background: def.color }}
                onClick={() => onPick(b)}
              >
                <Icon name={def.icon} size={32} />
                <span className="me-bioma-big__nm">{def.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

window.BiomaStrip = BiomaStrip;
