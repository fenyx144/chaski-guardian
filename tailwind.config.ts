/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        crema: "#fef6e8",
        cocoa: "#3d2b1f",
        noche: "#241a13",
        carboncito: "#2e2318",
        sol: "#ffc933",
        naranja: "#ef7d26",
        coral: "#ff5833",
        hoja: "#1faa5c",
        cielo: "#4494f7",
        clay: "#9a3412",
        andino: {
          verde: "#2f9e44",
          verdeOscuro: "#1d5c2e",
          verdeProfundo: "#14532d",
          negro: "#141210",
          carbon: "#1e1b16",
          ocre: "#c77d2a",
          ocreClaro: "#e8a94e",
          arena: "#efe3cb",
        },
      },
      boxShadow: {
        pop: "4px 4px 0 #3d2b1f",
        "pop-sm": "3px 3px 0 #3d2b1f",
        "pop-sol": "4px 4px 0 #ffc933",
        "pop-noche": "4px 4px 0 rgba(0,0,0,.55)",
        tarjeta:
          "0 1px 2px rgba(61,43,31,.07), 0 12px 32px -16px rgba(61,43,31,.25)",
      },
      fontFamily: {
        display: ['var(--font-display)', "Arial Black", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mano: ["var(--font-mano)", "cursive"],
      },
    },
  },
  plugins: [],
};
