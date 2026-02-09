import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        foreground: "#E8E3D7",
        muted: {
          DEFAULT: "#1A1A1A",
          foreground: "#A0A0A0",
        },
        accent: {
          DEFAULT: "#C8A24A",
          foreground: "#0A0A0A",
        },
        border: "#2A2A2A",
      },
      fontFamily: {
        sans: ["var(--font-cormorant)", "Georgia", "serif"],
        display: ["var(--font-cinzel)", "serif"],
      },
      backgroundImage: {
        'grain': "url('/images/grain.png')",
        'marble': "url('/images/marble-texture.jpg')",
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { textShadow: '0 0 10px rgba(200, 162, 74, 0.5)', filter: 'drop-shadow(0 0 8px rgba(200, 162, 74, 0.3))' },
          '100%': { textShadow: '0 0 25px rgba(200, 162, 74, 0.8), 0 0 50px rgba(200, 162, 74, 0.4)', filter: 'drop-shadow(0 0 20px rgba(200, 162, 74, 0.5))' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
