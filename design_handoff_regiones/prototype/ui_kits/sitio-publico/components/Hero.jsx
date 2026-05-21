// Hero.jsx — photo bg (image-slot, user-droppable) + dark overlay +
// eyebrow + h1 + buscador + nav pills. Botón "Cambiar foto" en top-right
// abre el file picker del image-slot para reemplazar la foto del destino.
const { useRef: useRefHero } = React;

function Hero({ destino }) {
  const slotRef = useRefHero(null);
  const region = `${destino.region} · ${destino.pais}`;

  function pickPhoto() {
    const slot = slotRef.current;
    if (!slot) return;
    const input = slot.shadowRoot?.querySelector('input[type="file"]');
    if (input) input.click();
  }

  return (
    <section className="me-hero" aria-labelledby="hero-title">
      <div className="me-hero__bg">
        <image-slot
          ref={slotRef}
          id={`hero-${destino.slug}`}
          shape="rect"
          fit="cover"
          src={destino.hero}
          placeholder={`Arrastrá una foto de ${destino.nombre}`}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
      <div className="me-hero__overlay" />
      <div className="me-hero__vignette" />

      <button
        type="button"
        className="me-hero__upload"
        onClick={pickPhoto}
        title={`Subir foto de ${destino.nombre}`}
      >
        <Icon name="image-up" size={14} />
        Cambiar foto del destino
      </button>

      <div className="me-container">
        <div className="me-hero__inner">
          <p className="me-eyebrow me-eyebrow--on-dark">{region}</p>
          <h1 id="hero-title" className="me-hero__title">{destino.nombre}</h1>
          <p className="me-hero__lead">{destino.descripcion_corta}</p>
          <div className="me-hero__search">
            <BuscadorBar variant="hero" />
          </div>
          <div className="me-hero__pills">
            <a href="#hospedajes" className="me-ghost-pill"><Icon name="building-2" size={14} />Hospedajes</a>
            <a href="#gastronomia" className="me-ghost-pill"><Icon name="utensils" size={14} />Gastronomía</a>
            <a href="#atractivos" className="me-ghost-pill"><Icon name="camera" size={14} />Atractivos</a>
          </div>
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
