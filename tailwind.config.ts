import type { Config } from "tailwindcss";

/**
 * Design tokens from the brief §13. Nine palette values, no gradients.
 * The full type/geometry/motion polish lands in M5; this establishes the
 * palette + a few primitives so everything built on top is already on-token.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: "#E6E9E4",
        surface: "#F4F6F2",
        ink: "#14181A",
        "ink-soft": "#5B6560",
        rule: "#C9CFC7",
        task: "#2E4E6E",
        goal: "#2F5D50",
        overdue: "#B67A16",
        conflict: "#A32E3C",
      },
      borderRadius: {
        // "Radius 3px on everything except the ledger, which is square."
        DEFAULT: "3px",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-data)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Scale: 32 / 22 / 16 / 14 / 12.5
        display: ["32px", { lineHeight: "1.2" }],
        head: ["22px", { lineHeight: "1.25" }],
        base: ["16px", { lineHeight: "1.4" }],
        ui: ["14px", { lineHeight: "1.35" }],
        data: ["12.5px", { lineHeight: "1.3" }],
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0, 0, 0.2, 1)",
      },
      transitionDuration: {
        state: "120ms",
        drag: "180ms",
      },
    },
  },
  plugins: [],
};

export default config;
