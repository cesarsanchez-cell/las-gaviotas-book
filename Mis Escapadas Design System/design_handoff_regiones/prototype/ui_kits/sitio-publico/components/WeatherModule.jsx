// WeatherModule.jsx — temp + condición + máx/mín/UV + salida/puesta sol +
// marea (sólo si el destino es costero, biomas incluye "playa"). Animación
// fade-up en la temperatura.
function WeatherModule({ destino, weather, biomas }) {
  const esCostero = biomas?.includes("playa");
  return (
    <article className="me-card me-mod me-mod--weather" aria-label="Clima hoy">
      <div className="me-mod__hd">
        <span className="me-mod__lbl">Hoy en {destino}</span>
        <span className="me-mod__hint">actualizado · hace 12'</span>
      </div>
      <div className="me-mod__main">
        <div className="me-weather__big me-anim-fade-up">
          <span className="me-weather__temp">{weather.temp}</span>
          <span className="me-weather__deg">°C</span>
        </div>
        <div className="me-weather__cond">
          <span className="me-weather__icon" aria-hidden>
            <Icon name={weather.icon} size={36} />
          </span>
          <div>
            <p className="me-weather__cond-name">{weather.cond}</p>
            <p className="me-meta">Viento {weather.wind}</p>
          </div>
        </div>
      </div>
      <div className="me-mod__stats">
        <div><span className="v">{weather.max}°</span><span className="l">máx</span></div>
        <div><span className="v">{weather.min}°</span><span className="l">mín</span></div>
        <div><span className="v">{weather.hum}%</span><span className="l">humedad</span></div>
        <div><span className="v">UV {weather.uv}</span><span className="l">{weather.uv >= 6 ? "alto" : "moderado"}</span></div>
      </div>

      {/* Salida / puesta del sol — siempre visible */}
      {(weather.sunrise || weather.sunset) && (
        <div className="me-weather__sun">
          <div className="me-weather__sun-item">
            <Icon name="sunrise" size={16} />
            <span className="l">Sale</span>
            <span className="v">{weather.sunrise}</span>
          </div>
          <div className="me-weather__sun-bar" aria-hidden>
            <svg viewBox="0 0 100 24" preserveAspectRatio="none">
              <path d="M 2 22 C 30 -2 70 -2 98 22" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="me-weather__sun-item">
            <Icon name="sunset" size={16} />
            <span className="l">Se pone</span>
            <span className="v">{weather.sunset}</span>
          </div>
        </div>
      )}

      {/* Marea — sólo destinos costeros */}
      {esCostero && weather.marea && (
        <div className="me-weather__tide">
          <span className="me-weather__tide-ic"><Icon name="waves" size={14} /></span>
          <div className="me-weather__tide-body">
            <p className="me-weather__tide-now">{weather.marea.proxima} <span className="me-meta">· altura {weather.marea.altura}</span></p>
            <p className="me-meta">siguiente {weather.marea.siguiente.toLowerCase()}</p>
          </div>
        </div>
      )}
    </article>
  );
}

window.WeatherModule = WeatherModule;
