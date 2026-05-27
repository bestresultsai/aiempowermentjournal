/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Brand: Inter for headings, Proxima Nova (with Mulish free fallback) for body.
        heading: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Proxima Nova"', '"proxima-nova"', 'Mulish', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1E3A8A",
        },
        surface: {
          paper: "#FAFAF7",
          card:  "#FFFFFF",
          soft:  "#F1EFE9",
        },
        ink: {
          DEFAULT: "#0A0A0A",
          muted:   "#5B5B5B",
          subtle:  "#8E8E8E",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 6px 24px -8px rgba(15,23,42,0.08)",
        lift: "0 12px 40px -10px rgba(15,23,42,0.18)",
      },
      borderColor: {
        soft: "#ECEAE2",
      },
    },
  },
  plugins: [],
};
