import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/Landing.tsx",
    "./src/components/Header.tsx",
    "./src/components/Footer.tsx",
    "./src/sections/**/*.tsx",
    "./src/lib/initLandingPage.ts",
    "./src/lib/components.ts",
  ],
  prefix: "tw-",
  important: false,
  theme: {
    extend: {
      fontFamily: {
        poly: ['"poly"', 'serif'],
      },
    },
  },
  corePlugins: {
    preflight: false, // Disable base styles to avoid conflicts
  },
} satisfies Config;
