// ComboDetailModal.jsx — overlay con el detalle completo del combo.
// Cierra con Escape, click backdrop, o botón X. Bloquea scroll del body.
const { useEffect: useEffectCM } = React;

function ComboDetailModal({ combo, destino, hospedajes, gastronomia, imperdibles, onClose }) {
  useEffectCM(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!combo) return null;

  function lookup(ref, type) {
    if (type === "hospedaje")   return hospedajes.find((h) => h.slug === ref);
    if (type === "gastronomia") return gastronomia.find((l) => l.slug === ref);
    if (type === "atractivo")   return imperdibles.find((l) => l.slug === ref);
    return null;
  }

  const items = combo.chips.map((c) => ({
    type: c.type,
    beneficio: c.beneficio,
    entity: lookup(c.ref, c.type),
  }));

  return (
    <div className="me-modal" role="dialog" aria-modal="true" aria-labelledby="combo-modal-title" onClick={onClose}>
      <div className="me-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button className="me-modal__close" onClick={onClose} aria-label="Cerrar">
          <Icon name="x" size={20} />
        </button>

        <div className="me-modal__hero">
          <img src={combo.photos.hero} alt="" />
          <div className="me-modal__hero-veil" />
          <span className="me-combo__badge" style={{ top: 18, right: 18 }}>
            <Icon name="sparkles" size={11} />Solo en Mis Escapadas
          </span>
          <div className="me-modal__hero-text">
            <p className="me-eyebrow me-eyebrow--on-dark">
              <Icon name="map-pin" size={13} />{destino}
            </p>
            <h2 id="combo-modal-title" className="me-modal__title">{combo.titulo}</h2>
            <p className="me-modal__bajada">{combo.bajada}</p>
          </div>
        </div>

        <div className="me-modal__body">
          <section className="me-modal__sec">
            <p className="me-eyebrow me-eyebrow--muted">Lo que incluye</p>
            <div className="me-modal__items">
              {items.map((it) => {
                const def = { hospedaje: { label: "Dónde dormir", icon: "building-2" }, gastronomia: { label: "Para comer", icon: "utensils" }, atractivo: { label: "Para hacer", icon: "sparkles" } }[it.type];
                return (
                  <div key={it.type} className="me-modal__item">
                    <div className="me-modal__item-photo">
                      {it.entity?.photo ? <img src={it.entity.photo} alt="" /> : <Icon name={def.icon} size={32} />}
                    </div>
                    <div className="me-modal__item-body">
                      <span className={`me-combo__chip me-combo__chip--${it.type}`} style={{ alignSelf: "flex-start" }}>
                        <Icon name={def.icon} size={12} />{def.label}
                      </span>
                      <h4 className="me-modal__item-nm">{it.entity?.nombre || "Por confirmar"}</h4>
                      {it.entity?.descripcion_corta && (
                        <p className="me-meta">{it.entity.descripcion_corta}</p>
                      )}
                      <p className="me-modal__item-ben">
                        <Icon name="check" size={13} />{it.beneficio}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {combo.beneficios?.length > 0 && (
            <section className="me-modal__sec">
              <p className="me-eyebrow me-eyebrow--muted">Beneficios cruzados</p>
              <ul className="me-modal__cross">
                {combo.beneficios.map((b, i) => (
                  <li key={i}><Icon name="sparkles" size={13} />{b}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="me-modal__sec me-modal__sec--foot">
            <div className="me-combo__price">
              <span className="me-combo__price-l">Desde</span>
              <span className="me-combo__price-v">${combo.precio_desde.toLocaleString("es-AR")}</span>
              <span className="me-combo__price-n">por {combo.noches} {combo.noches === 1 ? "noche" : "noches"}</span>
              {combo.ahorro_pct && <span className="me-combo__save">Ahorro {combo.ahorro_pct}%</span>}
            </div>
            <div className="me-combo__act">
              <a className="me-btn me-btn--whatsapp me-btn--lg" href="#">
                <Icon name="message-circle" size={15} />Consultar por WhatsApp
              </a>
            </div>
          </section>

          <p className="me-modal__validez">
            <Icon name="calendar-check" size={13} />{combo.validez}
          </p>
        </div>
      </div>
    </div>
  );
}

window.ComboDetailModal = ComboDetailModal;
