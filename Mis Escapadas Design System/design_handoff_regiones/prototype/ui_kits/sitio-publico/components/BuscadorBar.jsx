// BuscadorBar.jsx — check-in / check-out / huéspedes + buscar.
const { useState: useStateBuscador } = React;

function BuscadorBar({ variant = "hero" }) {
  const [pax, setPax] = useStateBuscador(2);
  return (
    <form className={`me-buscador me-buscador--${variant}`} onSubmit={(e) => e.preventDefault()}>
      <div className="me-buscador__field">
        <label>Check-in</label>
        <div className="me-buscador__input">
          <Icon name="calendar" size={14} />
          <input className="me-input" defaultValue="lun 24 nov" />
        </div>
      </div>
      <div className="me-buscador__field">
        <label>Check-out</label>
        <div className="me-buscador__input">
          <Icon name="calendar" size={14} />
          <input className="me-input" defaultValue="dom 30 nov" />
        </div>
      </div>
      <div className="me-buscador__field">
        <label>Huéspedes</label>
        <div className="me-buscador__input">
          <Icon name="users" size={14} />
          <input className="me-input" value={`${pax} ${pax === 1 ? "adulto" : "adultos"}`} readOnly />
        </div>
      </div>
      <button type="submit" className="me-btn me-btn--primary me-btn--lg">
        <Icon name="search" size={14} />
        Buscar
      </button>
    </form>
  );
}

window.BuscadorBar = BuscadorBar;
