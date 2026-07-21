import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: "#14151A",
        surface: "#1D1F25",
        surface2: "#25272E",
        line: "#33353D",
        ink: "#EDEEF0",
        muted: "#8B8F98",
        blaze: "#4C7EFF",
        amber: "#FF8A3D",
        ok: "#3DDC97",
        danger: "#FF5D5D",
        paper: "#F7F8FA",
        card: "#FFFFFF",
        borderLight: "#E5E7EB",
        ink2: "#111827",
        muted2: "#6B7280",
        accent: "#2F6FED",
        accentSoft: "#EAF1FF",
        green: "#16A34A",
        greenSoft: "#DCFCE7",
        redSoft: "#FEE2E2",
        red: "#DC2626",
        amberSoft: "#FEF3C7",
        amber2: "#D97706",
        purple: "#7C3AED",
        purpleSoft: "#EDE4FF",
        orange: "#EA580C",
        orangeSoft: "#FFEDD5",
        teal: "#0D9488",
        tealSoft: "#CCFBF1",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
