// Design tokens — single source of truth for spacing, type scale, shadows.
// Tailwind config consumes Tailwind defaults; this file is for code that
// needs token values at runtime (e.g. inline styles, JS-driven animations).

export const tokens = {
  space: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
    "4xl": "6rem",
  },
  radius: {
    sm: "0.375rem",
    md: "0.625rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
  },
  shadow: {
    card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
    cardHover:
      "0 10px 30px -10px rgb(0 0 0 / 0.15), 0 4px 6px -4px rgb(0 0 0 / 0.06)",
    overlay: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  },
  z: {
    base: 0,
    raised: 10,
    dropdown: 50,
    sticky: 100,
    overlay: 200,
    modal: 300,
    toast: 400,
  },
  breakpoint: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1400,
  },
} as const;

export type Tokens = typeof tokens;
