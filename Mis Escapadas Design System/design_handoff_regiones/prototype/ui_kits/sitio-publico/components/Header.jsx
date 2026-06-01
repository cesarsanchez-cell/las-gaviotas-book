// Header.jsx — sticky. En modo "hub" muestra solo "Mis Escapadas".
// En modo "destino" muestra doble marca + nav.
const { useState: useStateHeader } = React;

function Header({ destinoNombre, mode = "destino", onGoHub }) {
  const [open, setOpen] = useStateHeader(false);
  const isHub = mode === "hub";
  const nav = isHub
    ? []
    : [
        { href: "#hospedajes",  label: "Hospedajes",  icon: "building-2" },
        { href: "#gastronomia", label: "Gastronomía", icon: "utensils" },
        { href: "#atractivos",  label: "Atractivos",  icon: "camera" },
      ];

  return (
    <>
      <header className="me-header">
        <div className="me-container">
          <div className="me-header__row">
            <div className="me-header__brand">
              <a
                href="#"
                className="me-mark"
                onClick={(e) => { e.preventDefault(); onGoHub?.(); }}
                aria-label="Mis Escapadas — Volver al hub"
              >
                <PinHeart size={20} strokeWidth={2} className="me-wm__pin" />
                <span className="me-wm__text">
                  <span className="me-wm__mis">Mis</span> <span className="me-wm__esc">Escapadas</span>
                </span>
              </a>
              {!isHub && destinoNombre && (
                <>
                  <span className="me-pipe" aria-hidden>|</span>
                  <a href="#" className="me-mark me-mark--destino">{destinoNombre}</a>
                </>
              )}
            </div>
            {!isHub && (
              <nav className="me-header__nav">
                {nav.map((n) => (
                  <a key={n.href} href={n.href} className="me-header__link">{n.label}</a>
                ))}
              </nav>
            )}
            {!isHub ? (
              <button className="me-header__menu" onClick={() => setOpen(true)} aria-label="Abrir menú">
                <Icon name="menu" size={20} />
              </button>
            ) : (
              <a
                className="me-header__chip"
                href="#"
                onClick={(e) => { e.preventDefault(); onGoHub?.(); }}
              >
                <Icon name="compass" size={14} />Cambiar destino
              </a>
            )}
          </div>
        </div>
      </header>

      {open && (
        <div className="me-drawer" onClick={() => setOpen(false)}>
          <aside className="me-drawer__panel" onClick={(e) => e.stopPropagation()}>
            <div className="me-drawer__top">
              <span className="me-mark" style={{ fontSize: "18px" }}>{destinoNombre}</span>
              <button className="me-header__menu" onClick={() => setOpen(false)} aria-label="Cerrar">
                <Icon name="x" size={20} />
              </button>
            </div>
            <nav className="me-drawer__nav">
              <a
                href="#"
                className="me-drawer__link"
                onClick={(e) => { e.preventDefault(); setOpen(false); onGoHub?.(); }}
              >
                <Icon name="compass" size={18} /><span>Cambiar destino</span>
              </a>
              {nav.map((n) => (
                <a key={n.href} href={n.href} className="me-drawer__link" onClick={() => setOpen(false)}>
                  <Icon name={n.icon} size={18} /><span>{n.label}</span>
                </a>
              ))}
              <div className="me-drawer__foot">Mis Escapadas — red de portales turísticos</div>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}

window.Header = Header;
