// SearchPanel.jsx — overlay tipo Airbnb, CONSCIENTE DE LA VERTICAL.
// El 2º y 3º selector cambian según la vertical activa:
//   hospedajes  → Cuándo (fechas) + Quién (adultos/menores/bebés)
//   gastronomia → Tipo (bar/resto/parador/cafetería/…) + Cuándo (opcional)
//   atractivos  → Tipo (atractivo/actividad/evento) + Cuándo (opcional)
// "Usar mi ubicación" vive como opción dentro de Dónde.
const { useState: useStateSP, useMemo: useMemoSP } = React;

const GASTRO_TIPOS = ["Restaurante", "Parrilla", "Bar", "Cervecería", "Café", "Parador", "Heladería", "Pizzería"];
const QUEHACER_TIPOS = ["Atractivos", "Actividades", "Eventos"];

function SearchPanel({ open, onClose, search, onApply, destinos, regiones, vertical = "hospedajes", onUseGeo }) {
  const [donde, setDonde]   = useStateSP(search.donde || "");
  const [cuando, setCuando] = useStateSP(search.cuando || "");
  const [fechaIn, setFechaIn]   = useStateSP("");
  const [fechaOut, setFechaOut] = useStateSP("");
  const [tipo, setTipo]     = useStateSP(search.tipo || "");
  const [adultos, setAdultos] = useStateSP(2);
  const [menores, setMenores] = useStateSP(0);
  const [bebes, setBebes]     = useStateSP(0);
  const [step, setStep]       = useStateSP("donde");

  const esHospedaje = vertical === "hospedajes";
  const tipos = vertical === "gastronomia" ? GASTRO_TIPOS : vertical === "atractivos" ? QUEHACER_TIPOS : [];

  const matches = useMemoSP(() => {
    if (!donde || donde.length < 2) return [];
    const q = donde.toLowerCase();
    const dRes = destinos
      .filter((d) => (window.isDestinoPublicado?.(d.slug) ?? true) && d.nombre.toLowerCase().includes(q))
      .slice(0, 4).map((d) => ({ type: "destino", ...d }));
    const rRes = regiones
      .filter((r) => (window.isRegionPublicada?.(r) ?? r.activo) && r.nombre.toLowerCase().includes(q))
      .slice(0, 3).map((r) => ({ type: "region", ...r }));
    return [...dRes, ...rRes];
  }, [donde, destinos, regiones]);

  function apply() {
    const pax = adultos + menores + bebes;
    const fmt = (s) => s ? new Date(s + "T00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : "";
    const cuandoLabel = fechaIn
      ? (fechaOut ? `${fmt(fechaIn)} → ${fmt(fechaOut)}` : fmt(fechaIn))
      : cuando;
    onApply({
      donde,
      cuando: cuandoLabel,
      tipo,
      quien: esHospedaje && pax > 0 ? `${pax} ${pax === 1 ? "viajero" : "viajeros"}` : "",
      pax: { adultos, menores, bebes },
      fechas: { in: fechaIn, out: fechaOut },
    });
    onClose();
  }

  function useGeo() {
    onUseGeo?.();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="me-sp" role="dialog" aria-modal="true" aria-label="Buscar">
      <button className="me-sp__backdrop" onClick={onClose} aria-label="Cerrar" />
      <div className="me-sp__panel">
        <header className="me-sp__head">
          <button className="me-sp__close" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={18} /></button>
          <p className="me-sp__title">Buscar tu escapada</p>
          <button className="me-sp__clear" onClick={() => { setDonde(""); setCuando(""); setTipo(""); setAdultos(2); setMenores(0); setBebes(0); }}>Limpiar</button>
        </header>
        <p className="me-sp__hint">Cada campo es opcional. Con solo el destino ya te mostramos las promos; sin destino, lugares cerca tuyo.</p>

        <div className="me-sp__body">
          {/* Dónde */}
          <section className={`me-sp__sec ${step === "donde" ? "is-open" : ""}`}>
            <button type="button" className="me-sp__sec-hd" onClick={() => setStep("donde")}>
              <span className="me-sp__sec-l">Dónde</span>
              <span className="me-sp__sec-v">{donde || "Ciudad, región o país"}</span>
            </button>
            {step === "donde" && (
              <div className="me-sp__sec-body">
                <div className="me-sp__donde-row">
                  <div className="me-sp__input">
                    <Icon name="search" size={16} />
                    <input type="search" autoFocus placeholder="ej: Las Gaviotas · Patagonia Lacustre"
                           value={donde} onChange={(e) => setDonde(e.target.value)} />
                  </div>
                  <button type="button" className="me-sp__geo-inline" onClick={useGeo} title="Usar mi ubicación">
                    <Icon name="locate-fixed" size={16} />
                    <span>Mi ubicación</span>
                  </button>
                </div>
                {matches.length > 0 && (
                  <ul className="me-sp__sugg">
                    {matches.map((m) => (
                      <li key={m.type + m.slug}>
                        <button type="button" className="me-sp__sugg-item" onClick={() => setDonde(m.nombre)}>
                          <span className={`me-sp__sugg-ic me-sp__sugg-ic--${m.type}`}>
                            <Icon name={m.type === "region" ? "map" : "map-pin"} size={16} />
                          </span>
                          <span className="me-sp__sugg-txt">
                            <span className="me-sp__sugg-nm">{m.nombre}</span>
                            <span className="me-sp__sugg-rg">{m.type === "destino" ? `${m.region} · ${m.pais}` : `Región · ${m.pais || "Argentina"}`}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* 2º selector — Tipo (gastro / qué hacer) */}
          {!esHospedaje && (
            <section className={`me-sp__sec ${step === "tipo" ? "is-open" : ""}`}>
              <button type="button" className="me-sp__sec-hd" onClick={() => setStep("tipo")}>
                <span className="me-sp__sec-l">{vertical === "gastronomia" ? "Qué tipo" : "Qué buscás"}</span>
                <span className="me-sp__sec-v">{tipo || (vertical === "gastronomia" ? "Bar, resto, parador…" : "Atractivos, actividades, eventos")}</span>
              </button>
              {step === "tipo" && (
                <div className="me-sp__sec-body">
                  <div className="me-sp__date-row">
                    {tipos.map((t) => (
                      <button key={t} type="button" className={`me-sp__date-chip ${tipo === t ? "is-active" : ""}`}
                              onClick={() => setTipo(tipo === t ? "" : t)}>{t}</button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Cuándo — siempre (en hospedaje es clave) */}
          <section className={`me-sp__sec ${step === "cuando" ? "is-open" : ""}`}>
            <button type="button" className="me-sp__sec-hd" onClick={() => setStep("cuando")}>
              <span className="me-sp__sec-l">Cuándo</span>
              <span className="me-sp__sec-v">{cuando || (esHospedaje ? "Elegí fechas" : "Cualquier día")}</span>
            </button>
            {step === "cuando" && (
              <div className="me-sp__sec-body">
                <div className="me-sp__date-row">
                  {(esHospedaje
                    ? ["Este finde", "Finde largo", "Una semana", "Quincena", "Sin fecha aún"]
                    : ["Hoy", "Este finde", "Esta semana", "Cualquier día"]
                  ).map((opt) => (
                    <button key={opt} type="button" className={`me-sp__date-chip ${cuando === opt ? "is-active" : ""}`}
                            onClick={() => { setCuando(cuando === opt ? "" : opt); setFechaIn(""); setFechaOut(""); }}>{opt}</button>
                  ))}
                </div>
                <div className="me-sp__cal">
                  <p className="me-sp__cal-l">O elegí la fecha exacta</p>
                  <div className="me-sp__cal-row">
                    <label className="me-sp__cal-field">
                      <span>{esHospedaje ? "Check-in" : "Desde"}</span>
                      <input type="date" value={fechaIn}
                             onChange={(e) => { setFechaIn(e.target.value); setCuando(""); }} />
                    </label>
                    {esHospedaje && (
                      <label className="me-sp__cal-field">
                        <span>Check-out</span>
                        <input type="date" value={fechaOut} min={fechaIn || undefined}
                               onChange={(e) => { setFechaOut(e.target.value); setCuando(""); }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Quién — solo hospedaje, con adultos/menores/bebés */}
          {esHospedaje && (
            <section className={`me-sp__sec ${step === "quien" ? "is-open" : ""}`}>
              <button type="button" className="me-sp__sec-hd" onClick={() => setStep("quien")}>
                <span className="me-sp__sec-l">Quién</span>
                <span className="me-sp__sec-v">
                  {adultos + menores + bebes > 0
                    ? [adultos && `${adultos} ad.`, menores && `${menores} men.`, bebes && `${bebes} beb.`].filter(Boolean).join(" · ")
                    : "Agregá viajeros"}
                </span>
              </button>
              {step === "quien" && (
                <div className="me-sp__sec-body">
                  <Counter label="Adultos" hint="13 años o más" value={adultos} min={1} onChange={setAdultos} />
                  <Counter label="Menores" hint="2 a 12 años" value={menores} onChange={setMenores} />
                  <Counter label="Bebés" hint="menos de 2 — no pagan" value={bebes} onChange={setBebes} />
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="me-sp__foot">
          <button type="button" className="me-btn me-btn--primary me-btn--lg me-sp__cta" onClick={apply}>
            <Icon name="search" size={16} />Buscar
          </button>
        </footer>
      </div>
    </div>
  );
}

function Counter({ label, hint, value, min = 0, max = 20, onChange }) {
  return (
    <div className="me-sp__counter">
      <div>
        <p className="me-sp__counter-lb">{label}</p>
        {hint && <p className="me-meta">{hint}</p>}
      </div>
      <div className="me-sp__counter-act">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Quitar ${label.toLowerCase()}`}><Icon name="minus" size={14} /></button>
        <span className="me-sp__counter-v">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Agregar ${label.toLowerCase()}`}><Icon name="plus" size={14} /></button>
      </div>
    </div>
  );
}

window.SearchPanel = SearchPanel;
