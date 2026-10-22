import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0B0C0F",
        panel: "#15171C",
        edge: "#2A2D35",
        bone: "#E9E6E1",
        haze: "#8B8F99",
        gold: "#C9A86A",
        "gold-bright": "#E0C38C",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
