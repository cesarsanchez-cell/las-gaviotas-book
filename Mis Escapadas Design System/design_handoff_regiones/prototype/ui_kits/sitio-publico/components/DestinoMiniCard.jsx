// DestinoMiniCard.jsx — versión chica para carousels de "trending" y
// "recientes". Aspect cuadrado-ish, gradient bioma, nombre, region.
function DestinoMiniCard({ destino, onOpen }) {
  const primary   = BIOMA[destino.biomas[0]];
  const secondary = BIOMA[destino.biomas[1]] || primary;

  return (
    <a
      className="me-mini"
      href={`#${destino.slug}`}
      onClick={(e) => { e.preventDefault(); onOpen?.(destino.slug); }}
    >
      <div
        className="me-mini__photo"
        style={{ background: `linear-gradient(135deg, ${primary.color} 0%, ${secondary.color} 100%)` }}
      >
        <span className="me-mini__glyph" aria-hidden>
          <Icon name={primary.icon} size={84} strokeWidth={1.2} />
        </span>
        <span className="me-mini__chip" style={{ background: primary.color }}>
          <Icon name={primary.icon} size={10} />
          {primary.label}
        </span>
        {destino.agregadoHace && (
          <span className="me-mini__new">
            <Icon name="sparkles" size={10} />Nuevo · {destino.agregadoHace}
          </span>
        )}
      </div>
      <div className="me-mini__body">
        <p className="me-mini__nm">{destino.nombre}</p>
        <p className="me-mini__rg">{destino.region}</p>
        <p className="me-mini__c">{destino.hospedajes_count} hospedajes</p>
      </div>
    </a>
  );
}

window.DestinoMiniCard = DestinoMiniCard;
