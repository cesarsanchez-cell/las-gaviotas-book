// AirbnbTop.jsx — Top bar inspirada en Airbnb. Mobile-first:
//   Mobile:    [logo]      [user menu]      → debajo: search pill compacta
//              Verticales horizontales debajo de la pill (scroll-x)
//   Desktop:   [logo]    [verticales centradas]    [user menu]
//              Pill expandida debajo
// Verticales: Hospedajes · Gastronomía · Atractivos (active state con
// underline + bold).
const { useEffect: useEffectAT } = React;

const VERTICALES = [
  { key: "hospedajes",   label: "Hospedajes",  icon: "bed-double" },
  { key: "gastronomia",  label: "Gastronomía", icon: "utensils-crossed" },
  { key: "atractivos",   label: "Qué hacer",   icon: "compass" },
];

function AirbnbTop({ vertical, onChangeVertical, onGoHub, search, onChangeSearch, onOpenSearch }) {
  const pill = vertical === "gastronomia"
    ? { b: search.tipo || "Tipo", c: search.cuando || "Cuándo" }
    : vertical === "atractivos"
    ? { b: search.tipo || "Qué", c: search.cuando || "Cuándo" }
    : { b: search.cuando || "Cuándo", c: search.quien || "Quién" };
  return (
    <header className="me-top">
      <div className="me-top__bar">
        <a href="#" className="me-top__logo" onClick={(e) => { e.preventDefault(); onGoHub(); }} aria-label="Mis Escapadas — Inicio">
          <PinHeart size={22} strokeWidth={2} className="me-wm__pin" />
          <span className="me-top__wm">
            <span className="me-wm__mis">Mis</span> <span className="me-wm__esc">Escapadas</span>
          </span>
        </a>

        {/* Verticales — desktop centradas */}
        <nav className="me-top__verticals me-top__verticals--desktop" aria-label="Categorías">
          {VERTICALES.map((v) => (
            <button
              key={v.key}
              type="button"
              className={`me-top__vert ${vertical === v.key ? "is-active" : ""}`}
              onClick={() => onChangeVertical(v.key)}
              aria-pressed={vertical === v.key}
            >
              <Icon name={v.icon} size={18} />
              <span>{v.label}</span>
            </button>
          ))}
        </nav>

        <UserMenu />
      </div>

      {/* Search pill compacta — siempre visible debajo del bar.
          Tap abre el panel expandido (lo maneja el padre via onOpenSearch). */}
      <div className="me-top__search-row">
        <button type="button" className="me-search-pill" onClick={onOpenSearch}>
          <span className="me-search-pill__a"><Icon name="search" size={14} />{search.donde || "Dónde"}</span>
          <span className="me-search-pill__sep" aria-hidden />
          <span className="me-search-pill__b">{pill.b}</span>
          <span className="me-search-pill__sep" aria-hidden />
          <span className="me-search-pill__c">{pill.c}</span>
          <span className="me-search-pill__btn" aria-hidden>
            <Icon name="search" size={14} />
          </span>
        </button>
      </div>

      {/* Verticales en mobile — debajo de la pill, scroll horizontal */}
      <nav className="me-top__verticals me-top__verticals--mobile" aria-label="Categorías">
        {VERTICALES.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`me-top__vert ${vertical === v.key ? "is-active" : ""}`}
            onClick={() => onChangeVertical(v.key)}
            aria-pressed={vertical === v.key}
          >
            <Icon name={v.icon} size={20} />
            <span>{v.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}

window.AirbnbTop = AirbnbTop;
window.VERTICALES = VERTICALES;
