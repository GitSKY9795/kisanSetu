/** @type {import('tailwindcss').Config} */
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
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        // Applied app-wide (via a class on <body>) when Hindi is the active language
        hindi: ['"Noto Sans Devanagari"', '"Inter"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
