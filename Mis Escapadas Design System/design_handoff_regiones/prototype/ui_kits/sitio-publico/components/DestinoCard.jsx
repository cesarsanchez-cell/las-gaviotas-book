// DestinoCard.jsx — card del destino en el hub.
// Layered approach:
//  1) Fondo pintado por CSS (gradient bioma + glyphs lucide) — siempre visible.
//  2) <image-slot> en capa superior con MISMO id que el hero del destino
//     (`hero-{slug}`) → si el usuario ya subió foto en el hero, también
//     aparece acá. Cuando el slot está vacío es transparente → se ve el
//     fondo pintado debajo.
//  3) Chips de biomas y flecha — arriba de todo.

function DestinoCard({ destino, onOpen }) {
  const primary   = BIOMA[destino.biomas[0]];
  const secondary = BIOMA[destino.biomas[1]] || primary;

  const paintedBg = {
    background: `linear-gradient(135deg, ${primary.color} 0%, ${secondary.color} 100%)`,
  };

  return (
    <a
      className="me-dcard"
      href={`#${destino.slug}`}
      onClick={(e) => { e.preventDefault(); onOpen(destino.slug); }}
    >
      <div className="me-dcard__photo me-dcard__photo--painted" style={paintedBg}>
        {/* Glyph grande del primer bioma, decorativo */}
        <span className="me-dcard__glyph" aria-hidden>
          <Icon name={primary.icon} size={160} strokeWidth={1.2} />
        </span>
        {/* Glyph secundario, esquina inferior derecha */}
        <span className="me-dcard__glyph me-dcard__glyph--sec" aria-hidden>
          <Icon name={secondary.icon} size={90} strokeWidth={1.2} />
        </span>

        {/* Same id as Hero — comparte foto entre card y hero del destino */}
        <image-slot
          id={`hero-${destino.slug}`}
          shape="rect"
          fit="cover"
          placeholder=""
          class="me-dcard__slot"
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        <div className="me-dcard__biomas">
          {destino.biomas.map((b) => {
            const def = BIOMA[b];
            return (
              <span key={b} className="me-dcard__chip" style={{ background: def.color }}>
                <Icon name={def.icon} size={12} />
                {def.label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="me-dcard__body">
        <p className="me-dcard__region"><Icon name="map-pin" size={13} />{destino.region} · {destino.pais}</p>
        <h3 className="me-dcard__name">Mis Escapadas a {destino.nombre}</h3>
        <p className="me-dcard__desc">{destino.descripcion_corta}</p>
        <div className="me-dcard__foot">
          <span className="me-dcard__count">
            {destino.hospedajes_count === 1
              ? "1 hospedaje verificado"
              : `${destino.hospedajes_count} hospedajes verificados`}
          </span>
          <span className="me-dcard__arrow"><Icon name="arrow-right" size={16} /></span>
        </div>
      </div>
    </a>
  );
}

window.DestinoCard = DestinoCard;
