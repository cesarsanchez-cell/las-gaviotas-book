// RegionCard.jsx — card de una región. Painted gradient con los biomas
// dominantes + glyphs lucide + nombre + descripcion + count de destinos.
function RegionCard({ region, onOpen }) {
  const primary   = BIOMA[region.biomas[0]];
  const secondary = BIOMA[region.biomas[1]] || primary;

  return (
    <a
      className="me-region"
      href={`#region:${region.slug}`}
      onClick={(e) => { e.preventDefault(); onOpen(region.slug); }}
    >
      <div
        className="me-region__photo"
        style={{ background: `linear-gradient(135deg, ${primary.color} 0%, ${secondary.color} 100%)` }}
      >
        <span className="me-region__glyph" aria-hidden>
          <Icon name={primary.icon} size={120} strokeWidth={1.2} />
        </span>
        <span className="me-region__glyph me-region__glyph--sec" aria-hidden>
          <Icon name={secondary.icon} size={64} strokeWidth={1.2} />
        </span>
        <div className="me-region__chips">
          {region.biomas.map((b) => {
            const def = BIOMA[b];
            return (
              <span key={b} className="me-region__chip" style={{ background: def.color }}>
                <Icon name={def.icon} size={11} />{def.label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="me-region__body">
        <h3 className="me-region__name">{region.nombre}</h3>
        <p className="me-region__desc">{region.descripcion}</p>
        <div className="me-region__foot">
          <span><strong>{region.destinos_count}</strong> destinos</span>
          <Icon name="arrow-right" size={14} />
        </div>
      </div>
    </a>
  );
}

window.RegionCard = RegionCard;
