/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        panel2: "var(--panel2)",
        stroke: "var(--stroke)",
        text: "var(--text)",
        muted: "var(--muted)",

        brand: "var(--brand)",
        brand2: "var(--brand2)",
        warn: "var(--warn)",
        danger: "var(--danger)",
      },

      borderRadius: {
        r: "var(--r)",
        r2: "var(--r2)",
      },

      boxShadow: {
        av: "var(--shadow)",
      },
    },
  },

  plugins: [],
};
