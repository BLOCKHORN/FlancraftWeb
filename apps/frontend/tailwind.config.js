export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        minecraft: ["'Minecraft Seven'", "sans-serif"],
        sans: ["'Montserrat'", "system-ui", "sans-serif"],
      },
      colors: {
        "mc-green": "#5ee034",
        "mc-blue": "#38bdf8",
        "mc-yellow": "#fbbf24",
        "mc-red": "#ef4444",
        "mc-pink": "#d946ef",
        "mc-dark": "#080a12",
        "mc-panel": "#11151d",
        "mc-inner": "#0a0c14",
        "mc-stroke": "#1e202f",
        "mc-gray": "#94a3b8",
      },
      backgroundImage: {
        'tech-grid': "linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)",
      },
      boxShadow: {
        'mc-block': 'inset -4px -4px 0px #0a0c14, inset 4px 4px 0px #2a3143',
        'mc-element': 'inset -3px -3px 0px #1e202f, inset 3px 3px 0px #4f556b',
        'gacha-gold': '0 0 20px rgba(251, 191, 36, 0.4)',
      },
      animation: {
        'mc-pulse': 'mc-pulse 2s infinite',
        'shine-sweep': 'shine-sweep 3s infinite',
      },
      keyframes: {
        'mc-pulse': {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.02)', filter: 'brightness(1.1)' },
        },
        'shine-sweep': {
          '0%': { left: '-100%' },
          '20%, 100%': { left: '200%' },
        }
      }
    },
  },
  plugins: [],
}