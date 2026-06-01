// ComboCard.jsx — card del combo curado. Click → onOpen(combo) abre el modal.
const CHIP_DEF = {
  hospedaje:   { label: "Dónde dormir",  icon: "building-2" },
  gastronomia: { label: "Para comer",    icon: "utensils" },
  atractivo:   { label: "Para hacer",    icon: "sparkles" },
};

function ComboCard({ combo, onOpen }) {
  function open(e) {
    e?.preventDefault?.();
    onOpen?.(combo);
  }
  return (
    <article className="me-combo" onClick={open}>
      <div className="me-combo__photo">
        <img className="me-combo__hero" src={combo.photos.hero} alt="" loading="lazy" />
        <div className="me-combo__veil" />
        <div className="me-combo__collage">
          <img src={combo.photos.a} alt="" loading="lazy" />
          <img src={combo.photos.b} alt="" loading="lazy" />
          <img src={combo.photos.c} alt="" loading="lazy" />
        </div>
        <span className="me-combo__badge">
          <Icon name="sparkles" size={11} />Solo en Mis Escapadas
        </span>
      </div>

      <div className="me-combo__body">
        <div className="me-combo__chips">
          {combo.chips.map((c) => {
            const def = CHIP_DEF[c.type];
            return (
              <span key={c.type} className={`me-combo__chip me-combo__chip--${c.type}`}>
                <Icon name={def.icon} size={12} />{def.label}
              </span>
            );
          })}
        </div>

        <h3 className="me-combo__title">{combo.titulo}</h3>
        <p className="me-combo__bajada">{combo.bajada}</p>

        <div className="me-combo__items">
          {combo.chips.map((c) => {
            const def = CHIP_DEF[c.type];
            return (
              <div key={c.type} className="me-combo__item">
                <span className={`me-combo__item-ic me-combo__chip--${c.type}`}>
                  <Icon name={def.icon} size={14} />
                </span>
                <p className="me-combo__item-text">{c.beneficio}</p>
              </div>
            );
          })}
        </div>

        {combo.beneficios?.length > 0 && (
          <div className="me-combo__cross">
            <p className="me-combo__cross-lbl">Beneficios cruzados</p>
            <ul className="me-combo__cross-list">
              {combo.beneficios.map((b, i) => (
                <li key={i}><Icon name="check" size={12} />{b}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="me-combo__foot">
          <div className="me-combo__price">
            <span className="me-combo__price-l">Desde</span>
            <span className="me-combo__price-v">
              ${combo.precio_desde.toLocaleString("es-AR")}
            </span>
            <span className="me-combo__price-n">por {combo.noches} {combo.noches === 1 ? "noche" : "noches"}</span>
            {combo.ahorro_pct && (
              <span className="me-combo__save">Ahorro {combo.ahorro_pct}%</span>
            )}
          </div>
          <div className="me-combo__act">
            <button type="button" className="me-btn me-btn--whatsapp me-btn--sm" onClick={(e) => { e.stopPropagation(); }}>
              <Icon name="message-circle" size={13} />Consultar
            </button>
            <button type="button" className="me-btn me-btn--outline me-btn--sm" onClick={open}>
              Ver detalle<Icon name="arrow-right" size={12} />
            </button>
          </div>
        </div>

        <p className="me-combo__validez">
          <Icon name="calendar-check" size={12} />{combo.validez}
        </p>
      </div>
    </article>
  );
}

window.ComboCard = ComboCard;
