import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', "system-ui", "sans-serif"],
        display: ['"Syne"', "system-ui", "sans-serif"],
      },
      colors: {
        /* Fond & texte — ton relevant pour ambiante plus lumineuse (contraste titré corps conservé). */
        ink: "#263a34",
        mist: "#fffefb",
        /*
         * Thème or + blanc : coral = or plus franc ; lime/violet = panneaux plus vifs.
         */
        coral: "#ecc85a",
        lime: "#faf6ee",
        violet: "#f2ebe2",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(236,200,90,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(250,246,238,0.13) 1px, transparent 1px)",
        "glow-conic":
          "conic-gradient(from 200deg at 50% 45%, #f0d878 0deg, #fffef9 100deg, #d4b84a 220deg, #faf6ee 300deg, #ecc85a 360deg)",
      },
      boxShadow: {
        brand: "0 18px 50px -20px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(255,255,255,0.1)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-up": "fadeUp 0.8s ease-out forwards",
        "pole-glow": "poleGlow 5s ease-in-out infinite alternate",
        "pole-shine": "poleShine 3.5s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        poleGlow: {
          "0%": { opacity: "0.42", transform: "scale(1)" },
          "100%": { opacity: "0.64", transform: "scale(1.12)" },
        },
        poleShine: {
          "0%, 100%": { opacity: "0.15", transform: "translateX(-40%) skewX(-12deg)" },
          "50%": { opacity: "0.35", transform: "translateX(40%) skewX(-12deg)" },
        },
      },
    },
  },
  plugins: [typography],
};
