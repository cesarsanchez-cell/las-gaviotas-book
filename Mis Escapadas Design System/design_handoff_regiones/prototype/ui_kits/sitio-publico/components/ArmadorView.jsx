// ArmadorView.jsx — el composer interactivo "armá tu escapada". Wizard
// mobile-first con 3 pasos: hospedaje → gastronomía → atractivo. A medida
// que el cliente selecciona, se activan beneficios cruzados (matchCrossPromos).
// El sticky footer crece de "0 de 3 seleccionados" a un summary con precio
// total + ahorro + CTA WhatsApp cuando los 3 están elegidos.
const { useState: useStateAR, useMemo: useMemoAR, useEffect: useEffectAR, useRef: useRefAR } = React;

const STEPS = [
  { key: "hospedaje",   label: "Dónde dormir",  icon: "building-2", pregunta: "¿Dónde te quedás?" },
  { key: "gastronomia", label: "Para comer",    icon: "utensils",   pregunta: "¿Dónde cenás o desayunás?" },
  { key: "atractivo",   label: "Para hacer",    icon: "sparkles",   pregunta: "¿Qué hacés mientras estás?" },
];

function ArmadorView({ destino, hospedajes, gastronomia, atractivos, crossPromos, onClose, onWhatsApp }) {
  const [sel, setSel] = useStateAR({ hospedaje: null, gastronomia: null, atractivo: null });
  const [activeStep, setActiveStep] = useStateAR(0);
  const stepRefs = useRefAR([null, null, null]);

  // Cuántos pasos están completos.
  const completedCount = (sel.hospedaje ? 1 : 0) + (sel.gastronomia ? 1 : 0) + (sel.atractivo ? 1 : 0);
  const allDone = completedCount === 3;

  // Reglas que matchean la selección actual.
  const matched = useMemoAR(
    () => window.matchCrossPromos(crossPromos, sel),
    [crossPromos, sel]
  );

  // Cuando el usuario selecciona en un paso, scroll suave al próximo paso.
  function pick(key, slug) {
    setSel((prev) => ({ ...prev, [key]: prev[key] === slug ? null : slug }));
    const idx = STEPS.findIndex((s) => s.key === key);
    if (idx >= 0 && idx < STEPS.length - 1) {
      setTimeout(() => {
        stepRefs.current[idx + 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveStep(idx + 1);
      }, 240);
    }
  }

  // ¿Qué beneficio aplica a este candidato dado lo ya elegido? Devuelve
  // strings concatenadas. Si nada matchea, devuelve null. Útil para mostrar
  // un badge "+15% off" al lado del item de gastro cuando ya está elegido el
  // hospedaje compatible.
  function getProspectiveBenefit(stepKey, candidateSlug) {
    const hypothesis = { ...sel, [stepKey]: candidateSlug };
    const hits = window.matchCrossPromos(crossPromos, hypothesis);
    // Sólo mostramos reglas que NO matcheaban antes (es decir, las que
    // se activan POR ESTA elección).
    const before = window.matchCrossPromos(crossPromos, sel).map((r) => r.beneficio);
    const novel = hits.filter((r) => !before.includes(r.beneficio));
    return novel;
  }

  // Precio estimado: suma simple para mock. En prod calcular desde tarifas.
  const precioEstimado = useMemoAR(() => {
    let total = 0;
    if (sel.hospedaje) total += 32000; // 1 noche
    if (sel.gastronomia) total += 12000;
    if (sel.atractivo) total += 4000;
    return total;
  }, [sel]);

  const ahorroBruto = matched.reduce((s, m) => {
    if (m.tipo === "off-gastro" && m.pct) return s + Math.round(12000 * m.pct / 100);
    if (m.tipo === "gratis-gastro") return s + 12000;
    if (m.tipo === "gratis-atractivo") return s + 4000;
    if (m.tipo === "gratis-bebida") return s + 4500;
    return s + 3000;
  }, 0);

  // Mensaje de WhatsApp pre-armado
  const whatsappMsg = useMemoAR(() => {
    if (!allDone) return "";
    const h = hospedajes.find((x) => x.slug === sel.hospedaje);
    const g = gastronomia.find((x) => x.slug === sel.gastronomia);
    const a = atractivos.find((x) => x.slug === sel.atractivo);
    const lines = [
      `Hola! Armé una escapada a ${destino.nombre} desde Mis Escapadas:`,
      `🏠 ${h?.nombre || "—"}`,
      `🍽️ ${g?.nombre || "—"}`,
      `🌅 ${a?.nombre || "—"}`,
      ``,
      `Beneficios que se me activaron:`,
      ...matched.map((m) => `· ${m.beneficio}`),
      ``,
      `¿Coordinamos?`,
    ];
    return encodeURIComponent(lines.join("\n"));
  }, [allDone, sel, hospedajes, gastronomia, atractivos, destino.nombre, matched]);

  // Sources por step
  const sources = { hospedaje: hospedajes, gastronomia, atractivo: atractivos };

  return (
    <div className="me-armador">
      {/* Top bar sticky */}
      <header className="me-armador__top">
        <button className="me-armador__back" onClick={onClose} aria-label="Cerrar armador">
          <Icon name="arrow-left" size={18} />
          <span className="me-armador__back-txt">Volver al destino</span>
        </button>
        <div className="me-armador__title">
          <p className="me-eyebrow"><Icon name="wand-sparkles" size={12} />Armá tu escapada</p>
          <h1 className="me-armador__h">{destino.nombre}</h1>
        </div>
        <div className="me-armador__progress" aria-label="Progreso">
          {STEPS.map((_, i) => (
            <span key={i} className={`me-armador__dot ${(i < completedCount) ? "is-done" : ""} ${i === activeStep ? "is-active" : ""}`} />
          ))}
        </div>
      </header>

      <main className="me-armador__main">
        {STEPS.map((step, idx) => {
          const list   = sources[step.key];
          const chosen = sel[step.key];
          return (
            <section
              key={step.key}
              ref={(el) => (stepRefs.current[idx] = el)}
              className={`me-armador__step ${chosen ? "is-chosen" : ""}`}
              aria-labelledby={`step-${step.key}`}
            >
              <header className="me-armador__step-head">
                <span className={`me-armador__step-num me-combo__chip--${step.key}`}>{idx + 1}</span>
                <div>
                  <p className="me-meta">Paso {idx + 1} de 3</p>
                  <h2 id={`step-${step.key}`} className="me-armador__step-q">{step.pregunta}</h2>
                </div>
                {chosen && (
                  <button type="button" className="me-armador__step-change" onClick={() => setSel((p) => ({ ...p, [step.key]: null }))}>
                    Cambiar
                  </button>
                )}
              </header>

              <div className="me-armador__options">
                {list.map((item) => {
                  const isPicked = chosen === item.slug;
                  const isOther  = chosen && !isPicked;
                  const benefits = !chosen ? getProspectiveBenefit(step.key, item.slug) : [];
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      className={`me-armador__opt ${isPicked ? "is-picked" : ""} ${isOther ? "is-dimmed" : ""}`}
                      onClick={() => pick(step.key, item.slug)}
                    >
                      <div className="me-armador__opt-photo">
                        {item.photo ? <img src={item.photo} alt="" loading="lazy" /> : <Icon name={step.icon} size={26} />}
                      </div>
                      <div className="me-armador__opt-body">
                        <div className="me-armador__opt-top">
                          <h3 className="me-armador__opt-nm">{item.nombre}</h3>
                          {isPicked && (
                            <span className="me-armador__check" aria-label="Seleccionado">
                              <Icon name="check" size={14} />
                            </span>
                          )}
                        </div>
                        {step.key === "hospedaje" && (
                          <p className="me-meta">
                            {item.tipo} · hasta {item.capacidad} personas
                          </p>
                        )}
                        {step.key === "gastronomia" && (
                          <p className="me-meta">{item.categoria}</p>
                        )}
                        {step.key === "atractivo" && (
                          <p className="me-meta">{item.categoria}</p>
                        )}
                        <p className="me-armador__opt-desc">{item.descripcion_corta}</p>
                        {benefits.length > 0 && (
                          <div className="me-armador__opt-bens">
                            {benefits.map((b, i) => (
                              <span key={i} className="me-armador__opt-ben">
                                <Icon name="sparkles" size={11} />{b.beneficio}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="me-armador__bottom-space" />
      </main>

      {/* Sticky bottom summary */}
      <aside className={`me-armador__summary ${allDone ? "is-ready" : ""}`} aria-live="polite">
        {!allDone ? (
          <>
            <div className="me-armador__summary-progress">
              <div className="me-armador__summary-bar"><span style={{ width: `${(completedCount / 3) * 100}%` }} /></div>
              <p className="me-armador__summary-l">
                <strong>{completedCount} de 3 seleccionados</strong>
                {completedCount > 0 && matched.length > 0 && <span> · {matched.length} beneficio{matched.length === 1 ? "" : "s"} activos</span>}
              </p>
            </div>
            <button type="button" className="me-btn me-btn--outline me-btn--sm" onClick={() => {
              const nextIdx = STEPS.findIndex((s) => !sel[s.key]);
              if (nextIdx >= 0) stepRefs.current[nextIdx]?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}>
              Seguir armando<Icon name="arrow-down" size={13} />
            </button>
          </>
        ) : (
          <>
            <div className="me-armador__summary-pre">
              <p className="me-armador__summary-l"><strong>Tu escapada está lista</strong></p>
              <p className="me-meta">{matched.length} beneficio{matched.length === 1 ? "" : "s"} activos · ahorro estimado <strong>${ahorroBruto.toLocaleString("es-AR")}</strong></p>
              <div className="me-armador__summary-mini">
                {STEPS.map((step) => {
                  const slug = sel[step.key];
                  const item = sources[step.key].find((x) => x.slug === slug);
                  return (
                    <div key={step.key} className="me-armador__summary-thumb">
                      {item?.photo ? <img src={item.photo} alt="" /> : <Icon name={step.icon} size={16} />}
                    </div>
                  );
                })}
              </div>
            </div>
            <a
              className="me-btn me-btn--whatsapp me-btn--lg me-armador__summary-cta"
              href={`https://wa.me/?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener"
              onClick={onWhatsApp}
            >
              <Icon name="message-circle" size={16} />Coordinar por WhatsApp
            </a>
          </>
        )}
      </aside>
    </div>
  );
}

window.ArmadorView = ArmadorView;
