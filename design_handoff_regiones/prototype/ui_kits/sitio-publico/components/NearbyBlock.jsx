// NearbyBlock.jsx — caja "Cerca tuyo". Si el usuario no dio geolocation,
// muestra el prompt. Si dio, muestra carousel con destinos cercanos (mock).
const { useState: useStateNB } = React;

function NearbyBlock({ destinos, onOpen }) {
  const [granted, setGranted] = useStateNB(false);
  const [denied, setDenied]   = useStateNB(false);

  function ask() {
    if (!navigator.geolocation) { setDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      () => setGranted(true),
      () => setDenied(true),
      { timeout: 8000 }
    );
  }

  if (granted) {
    return (
      <Section
        eyebrowIcon="locate-fixed"
        eyebrow="Cerca tuyo"
        title="A pocas horas de tu ubicación"
        subtitle="Calculado a partir de tu posición — perfecto para escapadas de fin de semana."
      >
        <div className="me-carousel">
          {destinos.slice(0, 6).map((d) => (<DestinoMiniCard key={d.slug} destino={d} onOpen={onOpen} />))}
        </div>
      </Section>
    );
  }

  return (
    <section className="me-section me-section--default">
      <div className="me-container">
        <div className="me-nearby-prompt">
          <div className="me-nearby-prompt__ic">
            <Icon name="locate-fixed" size={26} />
          </div>
          <div className="me-nearby-prompt__body">
            <h3 className="me-nearby-prompt__title">¿Te muestro destinos cerca tuyo?</h3>
            <p className="me-nearby-prompt__desc">
              Calculamos en tu navegador qué pueblos están a pocas horas de tu ubicación.
              Nada se guarda en el servidor.
            </p>
          </div>
          <div className="me-nearby-prompt__act">
            {denied ? (
              <span className="me-meta">No pudimos acceder a tu ubicación. Podés activarla desde el navegador.</span>
            ) : (
              <button className="me-btn me-btn--primary" onClick={ask}>
                <Icon name="locate-fixed" size={14} />Permitir ubicación
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

window.NearbyBlock = NearbyBlock;
