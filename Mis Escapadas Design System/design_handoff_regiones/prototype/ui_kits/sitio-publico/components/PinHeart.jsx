// PinHeart.jsx — Pin outline + heart filled, scaled & centered.
// Combina dos paths de Lucide: el "map-pin" (outline) y el "heart"
// (relleno, transformado para caer centrado dentro del bulto del pin).
// Toma color del padre via currentColor — tintarlo desde CSS.
function PinHeart({ size = 20, strokeWidth = 2, className = "", style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {/* Pin outline */}
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z" />
      {/* Heart, filled, scaled & translated to sit inside the pin bulge */}
      <g transform="translate(8.2 5.6) scale(0.32)">
        <path
          d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  );
}

window.PinHeart = PinHeart;
