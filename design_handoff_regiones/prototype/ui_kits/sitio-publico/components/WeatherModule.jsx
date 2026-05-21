// WeatherModule.jsx — temp + condición + máx/mín/UV. Animación fade-up.
function WeatherModule({ destino, weather }) {
  return (
    <article className="me-card me-mod me-mod--weather" aria-label="Clima hoy">
      <div className="me-mod__hd">
        <span className="me-mod__lbl">Hoy en {destino}</span>
        <span className="me-mod__hint">actualizado · hace 12'</span>
      </div>
      <div className="me-mod__main">
        <div className="me-weather__big">
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
    </article>
  );
}

window.WeatherModule = WeatherModule;
