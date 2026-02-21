/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        accent: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        surface: "#FFF8F5",
        card: "#FFFFFF",
        muted: "#F5F0ED",
        border: "#E8E0DA",
        text: {
          primary: "#1C1917",
          secondary: "#78716C",
          muted: "#A8A29E",
        },
        expense: "#F43F5E",
        income: "#10B981",
      },
      fontFamily: {
        sans: ["Inter_400Regular", "System"],
        medium: ["Inter_500Medium", "System"],
        semibold: ["Inter_600SemiBold", "System"],
        bold: ["Inter_700Bold", "System"],
      },
    },
  },
  plugins: [],
};
