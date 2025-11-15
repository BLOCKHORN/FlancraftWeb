/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["'Press Start 2P'", "sans-serif"],
      },
      colors: {
        'flan-gold': '#FFD700',
        'flan-dark': '#1d1b1b',
        'flan-gray': '#2b2b2b',
      },
    },
  },
  plugins: [],
}
