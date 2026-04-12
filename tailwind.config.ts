import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fffaf2",
        peach: "#ffe4c7",
        coral: "#eb8d63",
        sage: "#adc9a7",
        ink: "#4f433c",
        rose: "#e6b0aa",
        sky: "#c5e3ed"
      },
      fontFamily: {
        sans: ["\"Noto Sans TC\"", "\"Microsoft JhengHei\"", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 40px rgba(154, 113, 84, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
