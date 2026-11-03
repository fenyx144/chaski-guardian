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
        andino: {
          verde: "#2f9e44",
          verdeOscuro: "#1d5c2e",
          negro: "#141210",
          carbon: "#1e1b16",
          ocre: "#c77d2a",
          ocreClaro: "#e8a94e",
          arena: "#efe3cb",
        },
      },
      fontFamily: {
        display: ["'Trebuchet MS'", "Verdana", "sans-serif"],
      },
    },
  },
  plugins: [],
};
