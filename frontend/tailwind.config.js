/** @type {import('tailwindcss').Config} */

// Design language: a warm, editorial agri-fintech palette. The stock Tailwind
// neutrals are cool/blue-leaning, which fights the green brand and reads generic;
// every scale below is retuned toward a sage-warm axis so the existing utility
// classes across the app render as one deliberate system.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Palette inspired by the SIH deck (navy + gold accents)
        brand: {
          navy: "#0F1B3D",
          gold: "#C9A227",
          green: "#1E7A46",
        },

        // Warm sage-stone neutrals replace the default cool grays.
        gray: {
          50: "#f8f9f6",
          100: "#f0f2ec",
          200: "#e1e6dc",
          300: "#c8d1c2",
          400: "#9aa795",
          500: "#72806e",
          600: "#576352",
          700: "#414b3e",
          800: "#2d352b",
          900: "#1b211a",
          950: "#0e120d",
        },

        // Deep forest charcoal for the dark console panels, so they read as part
        // of the brand rather than a different product's blue-gray.
        slate: {
          50: "#f6f8f6",
          100: "#eaefe9",
          200: "#d5ddd3",
          300: "#b3c1b2",
          400: "#839986",
          500: "#647a68",
          600: "#4c5f50",
          700: "#3a4b3e",
          800: "#26332a",
          900: "#18231b",
          950: "#0d1510",
        },

        // Richer, less neon forest green than stock emerald.
        emerald: {
          50: "#f0f7f1",
          100: "#dcedde",
          200: "#badcc3",
          300: "#8cc39d",
          400: "#58a576",
          500: "#328757",
          600: "#236b45",
          700: "#1c5638",
          800: "#18452e",
          900: "#143828",
          950: "#0a1f16",
        },

        // Antique gold rather than the stock high-chroma yellow.
        amber: {
          50: "#fdf9ed",
          100: "#f9f0d4",
          200: "#f2dfa6",
          300: "#e7c876",
          400: "#dab152",
          500: "#c79535",
          600: "#a8762b",
          700: "#855826",
          800: "#6c4624",
          900: "#5b3b21",
          950: "#341e0f",
        },

        // Accent hues, desaturated to sit alongside the neutrals without shouting.
        blue: {
          50: "#eff5fa", 100: "#dbe8f3", 200: "#bcd5e8", 300: "#91b8d7",
          400: "#6396c1", 500: "#437aa9", 600: "#33618d", 700: "#2b4e72",
          800: "#27435f", 900: "#243a51", 950: "#182536",
        },
        teal: {
          50: "#eff7f6", 100: "#d9ebe9", 200: "#b6d8d4", 300: "#88bcb8",
          400: "#589b98", 500: "#3d7f7d", 600: "#2f6665", 700: "#295353",
          800: "#254444", 900: "#223a3a", 950: "#102121",
        },
        purple: {
          50: "#f5f2f8", 100: "#ebe5f1", 200: "#d9cee4", 300: "#bfacd0",
          400: "#a084b7", 500: "#86679e", 600: "#6e5283", 700: "#5b446b",
          800: "#4d3b59", 900: "#42344b", 950: "#291e30",
        },
        indigo: {
          50: "#f2f3f9", 100: "#e5e7f3", 200: "#ccd0e7", 300: "#a9afd4",
          400: "#858bbe", 500: "#6a6ea6", 600: "#55578a", 700: "#474870",
          800: "#3d3e5e", 900: "#37374f", 950: "#232235",
        },
        rose: {
          50: "#fcf3f3", 100: "#f9e5e5", 200: "#f2cfcf", 300: "#e5aaaa",
          400: "#d47c7c", 500: "#bf5959", 600: "#a34242", 700: "#883737",
          800: "#723131", 900: "#622e2e", 950: "#351515",
        },
      },

      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        // Editorial serif for display headings and hero numerals.
        display: ['"Fraunces"', "Georgia", '"Times New Roman"', "serif"],
        // Applied app-wide (via a class on <body>) when Hindi is the active language
        hindi: ['"Noto Sans Devanagari"', '"Inter"', "sans-serif"],
      },

      // Soft, layered, green-tinted elevation. Stock Tailwind shadows are a single
      // hard black blur, which is what makes an otherwise fine layout look cheap.
      boxShadow: {
        sm: "0 1px 2px rgba(24,45,30,.04), 0 2px 6px rgba(24,45,30,.04)",
        DEFAULT: "0 1px 2px rgba(24,45,30,.04), 0 4px 12px rgba(24,45,30,.06)",
        md: "0 2px 4px rgba(24,45,30,.04), 0 8px 20px rgba(24,45,30,.07)",
        lg: "0 4px 8px rgba(24,45,30,.04), 0 14px 34px rgba(24,45,30,.09)",
        xl: "0 8px 16px rgba(24,45,30,.05), 0 24px 52px rgba(24,45,30,.11)",
        "2xl": "0 16px 32px rgba(24,45,30,.06), 0 40px 80px rgba(24,45,30,.14)",
        inner: "inset 0 1px 2px rgba(24,45,30,.06)",
      },

      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },

      keyframes: {
        // Referenced as `animate-fadeIn` in several modals but never defined,
        // so those panels were appearing with no transition at all.
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px) scale(.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        riseIn: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 320ms cubic-bezier(.22,.68,.3,1) both",
        riseIn: "riseIn 460ms cubic-bezier(.22,.68,.3,1) both",
      },
    },
  },
  plugins: [],
};
