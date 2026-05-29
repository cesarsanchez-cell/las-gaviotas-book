// map-pin-heart relleno — no está en esta versión del bundle de lucide-react,
// así que lo inlineamos (igual que en el prototipo del handoff). Usa
// currentColor para tintarse desde el contenedor.

interface PinHeartProps {
  size?: number;
  className?: string;
}

export function PinHeart({ size = 22, className }: PinHeartProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9.31 9.31a2.4 2.4 0 0 1 3.4 0l.29.3.29-.3a2.4 2.4 0 1 1 3.4 3.4L13 16l-3.69-3.29a2.4 2.4 0 0 1 0-3.4z" />
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    </svg>
  );
}
