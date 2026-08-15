/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F8FAFC",
        primary: "#0F172A",
        surface: "#FFFFFF",
        border: "#E2E8F0",
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
        info: "#2563EB",
      },
    },
  },
  plugins: [],
};
