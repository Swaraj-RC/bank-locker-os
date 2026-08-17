/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F8FAFC",
        navy: "#0F172A",
        bankBlue: "#003366",
        accent: "#2563EB",
        primary: "#0F172A",
        surface: "#FFFFFF",
        border: "#E2E8F0",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        info: "#2563EB",
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};
