// HeroCarousel.jsx — Carrousel emocional que reemplaza el buscador en el
// hero del destino. Muestra una mezcla de imperdibles, hospedajes destacados
// y gastronómicos. Swipe-able vía scroll-snap (nativo, mobile-first), dots
// indicator sincronizados con IntersectionObserver, auto-advance suave.
const { useRef: useRefHC, useState: useStateHC, useEffect: useEffectHC, useMemo: useMemoHC } = React;

const HC_TYPE = {
  atractivo:   { label: "Imperdible",   icon: "sparkles",   tone: "var(--me-color-accent)" },
  hospedaje:   { label: "Dónde dormir", icon: "building-2", tone: "var(--me-petrol)" },
  gastronomia: { label: "Para comer",   icon: "utensils",   tone: "var(--me-wm-mis)" },
};

function HeroCarousel({ destino, imperdibles, hospedajes, gastronomia, onSearch }) {
  // Slides: tomamos imperdibles primero, después 1-2 hospedajes destacados,
  // después 1-2 gastronómicos. Total objetivo: 5.
  const slides = useMemoHC(() => {
    const out = [];
    imperdibles.filter((l) => l.imperdible).slice(0, 2).forEach((l) => out.push({
      type: "atractivo", slug: l.slug, nombre: l.nombre, categoria: l.categoria,
      descripcion: l.descripcion_corta, photo: l.photo, bioma: destino.biomas[0],
    }));
    hospedajes.filter((h) => h.destacado).slice(0, 2).forEach((h) => out.push({
      type: "hospedaje", slug: h.slug, nombre: h.nombre, categoria: h.tipo,
      descripcion: h.descripcion_corta, photo: h.photo, bioma: destino.biomas[1] || destino.biomas[0],
    }));
    gastronomia.slice(0, 2).forEach((l) => out.push({
      type: "gastronomia", slug: l.slug, nombre: l.nombre, categoria: l.categoria,
      descripcion: l.descripcion_corta, photo: l.photo, bioma: destino.biomas[0],
    }));
    // Si falta, completar con más imperdibles
    if (out.length < 5) {
      imperdibles.filter((l) => !l.imperdible).slice(0, 5 - out.length).forEach((l) => out.push({
        type: "atractivo", slug: l.slug, nombre: l.nombre, categoria: l.categoria,
        descripcion: l.descripcion_corta, photo: l.photo, bioma: destino.biomas[0],
      }));
    }
    return out.slice(0, 5);
  }, [imperdibles, hospedajes, gastronomia, destino.biomas]);

  const trackRef = useRefHC(null);
  const [active, setActive] = useStateHC(0);
  const [paused, setPaused] = useStateHC(false);

  // Sync active dot with scroll position (IntersectionObserver per slide).
  useEffectHC(() => {
    const track = trackRef.current;
    if (!track) return;
    const slidesEls = track.querySelectorAll(".me-hc__slide");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.intersectionRatio > 0.6) {
            const idx = Number(e.target.getAttribute("data-idx"));
            setActive(idx);
          }
        });
      },
      { root: track, threshold: [0.6] }
    );
    slidesEls.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [slides]);

  // Auto-advance every 6s. Pause on hover/touch.
  useEffectHC(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const next = (active + 1) % slides.length;
      const slideEl = track.querySelector(`[data-idx="${next}"]`);
      slideEl?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }, 6000);
    return () => clearInterval(id);
  }, [active, paused, slides.length]);

  function goTo(idx) {
    const track = trackRef.current;
    if (!track) return;
    const slideEl = track.querySelector(`[data-idx="${idx}"]`);
    slideEl?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  return (
    <section className="me-hc" aria-roledescription="carousel" aria-label={`Imperdibles de ${destino.nombre}`}>
      {/* Eyebrow del destino sobre el carrousel */}
      <div className="me-hc__head">
        <div className="me-container">
          <p className="me-eyebrow me-eyebrow--on-dark">
            {destino.region} · {destino.pais}
          </p>
          <h1 className="me-hc__title">{destino.nombre}</h1>
          <p className="me-hc__lead">{destino.descripcion_corta}</p>
        </div>
      </div>

      <div
        ref={trackRef}
        className="me-hc__track"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
      >
        {slides.map((s, i) => {
          const type = HC_TYPE[s.type];
          const bioma = BIOMA[s.bioma] || BIOMA.playa;
          return (
            <article
              key={s.slug + i}
              className="me-hc__slide"
              data-idx={i}
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${slides.length}: ${s.nombre}`}
            >
              <div
                className="me-hc__photo"
                style={{
                  background: `linear-gradient(135deg, ${bioma.color} 0%, ${HC_TYPE[s.type].tone} 100%)`,
                }}
              >
                {s.photo && <img src={s.photo} alt="" loading={i === 0 ? "eager" : "lazy"} />}
                <span className="me-hc__glyph" aria-hidden>
                  <Icon name={bioma.icon} size={180} strokeWidth={1.1} />
                </span>
                <div className="me-hc__veil" />
              </div>
              <div className="me-hc__overlay">
                <div className="me-hc__overlay-top">
                  <span className="me-hc__chip" style={{ background: type.tone }}>
                    <Icon name={type.icon} size={12} />{type.label}
                  </span>
                  {s.categoria && (
                    <span className="me-hc__chip me-hc__chip--ghost">{s.categoria}</span>
                  )}
                </div>
                <div className="me-hc__overlay-bot">
                  <h2 className="me-hc__nm">{s.nombre}</h2>
                  <p className="me-hc__desc">{s.descripcion}</p>
                  <a className="me-hc__cta" href={`#${s.type}-${s.slug}`}>
                    Conocer más<Icon name="arrow-right" size={14} />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Dots indicator */}
      <div className="me-hc__dots" role="tablist">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`me-hc__dot ${active === i ? "is-active" : ""}`}
            onClick={() => goTo(i)}
            aria-selected={active === i}
            aria-label={`Ir al slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Buscador como CTA secundario — al pie del hero */}
      <div className="me-hc__searchcta">
        <button type="button" className="me-btn me-btn--primary me-btn--lg me-hc__searchbtn" onClick={onSearch}>
          <Icon name="calendar-search" size={16} />
          Buscar fechas y disponibilidad
        </button>
      </div>
    </section>
  );
}

window.HeroCarousel = HeroCarousel;
