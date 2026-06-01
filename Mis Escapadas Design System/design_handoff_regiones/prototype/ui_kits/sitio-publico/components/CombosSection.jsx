// CombosSection.jsx — sección "Escapadas armadas" en la home del destino.
// Muestra combos curados del admin local + CTA grande para armar tu propia
// escapada al final (entra al Armador).
function CombosSection({ destino, combos, onOpenCombo, onOpenArmador }) {
  const hasCombos = combos && combos.length > 0;

  return (
    <section className="me-section me-section--combos" id="combos" aria-labelledby="combos-title">
      <div className="me-container">
        <header className="me-section__head">
          <div className="me-section__lead">
            <p className="me-eyebrow"><Icon name="sparkles" size={14} />Escapadas armadas</p>
            <h2 id="combos-title" className="me-section__title">Lo que sólo conseguís acá</h2>
            <p className="me-section__sub">
              Los comerciantes de {destino} arman combos juntos — hospedaje, mesa y experiencia
              en una sola propuesta, con beneficios que no existen por separado.
            </p>
          </div>
          {hasCombos && combos.length > 1 && (
            <a href="#" className="me-section__link">Ver todas las escapadas →</a>
          )}
        </header>

        {hasCombos ? (
          <div className={`me-combo-grid me-combo-grid--${combos.length === 1 ? "single" : "many"}`}>
            {combos.map((c) => (<ComboCard key={c.slug} combo={c} onOpen={onOpenCombo} />))}
          </div>
        ) : (
          <div className="me-combo-empty">
            <p className="me-combo-empty__txt">Todavía no hay combos curados en {destino}. Armá la escapada vos mismo.</p>
          </div>
        )}

        {/* CTA grande al Armador */}
        <div className="me-armador-cta">
          <div className="me-armador-cta__body">
            <p className="me-eyebrow me-eyebrow--on-dark"><Icon name="wand-sparkles" size={14} />Armado a tu medida</p>
            <h3 className="me-armador-cta__title">Armá tu escapada en {destino}</h3>
            <p className="me-armador-cta__sub">
              Elegí dónde dormir, dónde comer y qué hacer.
              El sistema te muestra los descuentos cruzados que se activan según la combinación.
            </p>
          </div>
          <button type="button" className="me-btn me-btn--lg me-armador-cta__btn" onClick={onOpenArmador}>
            <Icon name="wand-sparkles" size={16} />Empezar a armar
          </button>
        </div>
      </div>
    </section>
  );
}

window.CombosSection = CombosSection;
