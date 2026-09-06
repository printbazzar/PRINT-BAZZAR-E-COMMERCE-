/** @type {import('tailwindcss').Config} */
const flowbite = require("flowbite-react/tailwind");
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    flowbite.content(),
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: "#FACC15",
          "yellow-hover": "#EAB308",
          "yellow-dark": "#CA8A04",
          "yellow-light": "#FEF9C3",
          black: "#111111",
          dark: "#18181B",
          charcoal: "#27272A",
          gray: "#71717A",
          light: "#F8F9FA",
          border: "#E5E7EB",
        },
      },
    },
  },
  plugins: [
    flowbite.plugin(),
  ],
}