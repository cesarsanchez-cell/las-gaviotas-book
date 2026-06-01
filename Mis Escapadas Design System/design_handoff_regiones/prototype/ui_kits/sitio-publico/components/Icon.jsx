// Icon.jsx — wraps lucide. After every render, calls lucide.createIcons()
// so freshly-mounted <i data-lucide="..."> nodes get hydrated to SVG.
//
// Usage: <Icon name="map-pin" size={16} className="text-muted" />

const { useEffect, useRef } = React;

function Icon({ name, size = 16, className = "", strokeWidth = 2, style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      window.lucide.createIcons({
        nameAttr: "data-lucide",
        attrs: { width: size, height: size, "stroke-width": strokeWidth },
        elements: [ref.current],
      });
    }
  });
  return (
    <i
      ref={ref}
      data-lucide={name}
      className={className}
      style={{ display: "inline-flex", width: size, height: size, ...style }}
      aria-hidden="true"
    />
  );
}

window.Icon = Icon;
