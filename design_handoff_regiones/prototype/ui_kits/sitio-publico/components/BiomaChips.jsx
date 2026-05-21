// BiomaChips.jsx — particularidad de la zona. Pop-in stagger.
const BIOMA = {
  playa:    { color: "#3bafda", icon: "waves",        label: "Playa" },
  bosque:   { color: "#3f8159", icon: "trees",        label: "Bosque" },
  montana:  { color: "#6b7a8f", icon: "mountain",     label: "Montaña" },
  sierra:   { color: "#b97455", icon: "mountain-snow",label: "Sierra" },
  desierto: { color: "#d9b26a", icon: "sun",          label: "Desierto" },
  lago:     { color: "#3678b0", icon: "sailboat",     label: "Lago" },
};

function BiomaChips({ biomas, destino }) {
  return (
    <article className="me-card me-mod me-mod--bioma" aria-label="Particularidad de la zona">
      <div className="me-mod__hd">
        <span className="me-mod__lbl">Particularidad de la zona</span>
      </div>
      <div className="me-mod__main">
        <p className="me-bioma__lead">
          {destino} combina <strong>{biomas.map((b) => BIOMA[b].label.toLowerCase()).join(" + ")}</strong>{" "}
          — andar por el pueblo es pasar del pinar a la arena en cinco minutos.
        </p>
        <div className="me-bioma__chips">
          {biomas.map((b, i) => {
            const def = BIOMA[b];
            return (
              <span
                key={b}
                className="me-bioma__chip me-anim-pop-in"
                style={{ background: def.color, animationDelay: `${i * 80}ms` }}
              >
                <Icon name={def.icon} size={18} />
                {def.label}
              </span>
            );
          })}
        </div>
      </div>
    </article>
  );
}

window.BiomaChips = BiomaChips;
window.BIOMA = BIOMA;
