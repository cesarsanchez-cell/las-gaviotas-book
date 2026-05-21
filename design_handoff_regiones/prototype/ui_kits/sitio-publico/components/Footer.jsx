// Footer.jsx — minimal footer (idem Footer.tsx).
function Footer() {
  return (
    <footer className="me-footer">
      <div className="me-container">
        <div className="me-footer__row">
          <div>
            <p className="me-footer__brand">
              <PinHeart size={18} strokeWidth={2} className="me-wm__pin" />
              <span className="me-wm__text">
                <span className="me-wm__mis">Mis</span> <span className="me-wm__esc">Escapadas</span>
              </span>
            </p>
            <p className="me-meta">Red de portales turísticos locales · verificados por la comunidad.</p>
          </div>
          <p className="me-meta">© {new Date().getFullYear()} Mis Escapadas. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

window.Footer = Footer;
