import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        gold: {
          50: "#faf6ed",
          100: "#f3ead3",
          200: "#e8d5a5",
          300: "#d9bb6f",
          400: "#cfa44f",
          500: "#bfa46f",
          600: "#a8894a",
          700: "#8c6c3c",
          800: "#735735",
          900: "#60482e",
          950: "#372517",
        },
        brand: {
          black: "#0a0a0a",
          dark: "#141414",
          charcoal: "#1e1e1e",
          gray: "#6b7280",
          lightgray: "#f5f5f5",
          white: "#fefefe",
          cream: "#faf8f4",
          gold: "#bfa46f",
          "gold-light": "#d4be8a",
          "gold-dark": "#a8894a",
          "gold-muted": "#bfa46f20",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gold-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: "fadeIn 0.5s ease-in-out",
        slideUp: "slideUp 0.5s ease-out",
        slideDown: "slideDown 0.5s ease-out",
        scaleIn: "scaleIn 0.3s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "gold-pulse": "gold-pulse 2s ease-in-out infinite",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },
      fontSize: {
        "10xl": "8rem",
        "11xl": "10rem",
      },
      boxShadow: {
        premium: "0 4px 30px rgba(0, 0, 0, 0.08)",
        "premium-lg": "0 10px 60px rgba(0, 0, 0, 0.12)",
        gold: "0 4px 20px rgba(191, 164, 111, 0.25)",
        "gold-lg": "0 8px 40px rgba(191, 164, 111, 0.35)",
        "gold-inner": "inset 0 0 20px rgba(191, 164, 111, 0.1)",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #bfa46f 0%, #a8894a 100%)",
        "gold-gradient-soft": "linear-gradient(135deg, rgba(191,164,111,0.1) 0%, rgba(168,137,74,0.05) 100%)",
        "gold-radial": "radial-gradient(circle at center, rgba(191,164,111,0.15) 0%, transparent 70%)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
