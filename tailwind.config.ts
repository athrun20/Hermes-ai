import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#080B10",
          900: "#0D1219",
          850: "#111822",
          800: "#151E2B",
          700: "#223045",
          600: "#33435C",
        },
        mint: {
          300: "#79F2C0",
          400: "#33D99B",
        },
        amberline: "#F5B84B",
        ink: "#E8EEF8",
      },
      boxShadow: {
        glow: "0 24px 90px rgba(51, 217, 155, 0.16)",
        panel:
          "0 20px 70px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.06)",
        insetPanel: "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
