import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import plugin from "tailwindcss/plugin";

// Custom plugin to generate duplicate utilities without prefix for app pages
const duplicateUtilitiesPlugin = plugin(function({ addUtilities, theme, e }) {
  // This will be automatically handled by Tailwind when we scan the content
});

// Plugin to support opacity with CSS variables (OKLCH)
// This plugin adds support for opacity modifiers like bg-primary/10, text-muted/50, etc.
const opacitySupportPlugin = plugin(function({ addUtilities, theme, matchUtilities }) {
  const colors = theme('colors') || {};
  
  // Function to generate opacity utilities for a color
  const generateOpacityUtilities = (colorName: string, cssVar: string, variants: string[] = []) => {
    const utilities: Record<string, any> = {};
    
    // Generate utilities for opacity values 5, 10, 20, 30, 40, 50, 60, 70, 80, 90
    [5, 10, 20, 30, 40, 50, 60, 70, 80, 90].forEach(opacity => {
      // Background - use bracket notation to handle special characters
      utilities[`.bg-${colorName}\\/${opacity}`] = {
        backgroundColor: `color-mix(in oklch, ${cssVar} ${opacity}%, transparent)`,
      };
      // Text
      utilities[`.text-${colorName}\\/${opacity}`] = {
        color: `color-mix(in oklch, ${cssVar} ${opacity}%, transparent)`,
      };
      // Border
      utilities[`.border-${colorName}\\/${opacity}`] = {
        borderColor: `color-mix(in oklch, ${cssVar} ${opacity}%, transparent)`,
      };
    });
    
    // Generate for variants
    variants.forEach(variant => {
      const variantName = `${colorName}-${variant}`;
      const variantVar = `var(--${colorName}-${variant})`;
      [5, 10, 20, 30, 40, 50, 60, 70, 80, 90].forEach(opacity => {
        utilities[`.bg-${variantName}\\/${opacity}`] = {
          backgroundColor: `color-mix(in oklch, ${variantVar} ${opacity}%, transparent)`,
        };
        utilities[`.text-${variantName}\\/${opacity}`] = {
          color: `color-mix(in oklch, ${variantVar} ${opacity}%, transparent)`,
        };
        utilities[`.border-${variantName}\\/${opacity}`] = {
          borderColor: `color-mix(in oklch, ${variantVar} ${opacity}%, transparent)`,
        };
      });
    });
    
    return utilities;
  };
  
  // Generate utilities for main colors
  const allUtilities: Record<string, any> = {};
  
  // Primary with variants
  Object.assign(allUtilities, generateOpacityUtilities('primary', 'var(--primary)', ['foreground', 'dark']));
  
  // Secondary with variants
  Object.assign(allUtilities, generateOpacityUtilities('secondary', 'var(--secondary)', ['foreground', 'hover']));
  
  // Muted with variants
  Object.assign(allUtilities, generateOpacityUtilities('muted', 'var(--muted)', ['foreground']));
  
  // Accent with variants
  Object.assign(allUtilities, generateOpacityUtilities('accent', 'var(--accent)', ['foreground']));
  
  // Other colors
  ['destructive', 'success', 'warning', 'border', 'background', 'foreground'].forEach(color => {
    Object.assign(allUtilities, generateOpacityUtilities(color, `var(--${color})`));
  });
  
  addUtilities(allUtilities);
});

export default {
  darkMode: ["class", ".tw-dark"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
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
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          dark: "var(--primary-dark)",
          foreground: "var(--primary-foreground)",
          glow: "var(--primary-glow)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          hover: "var(--secondary-hover)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
          light: "var(--destructive-light)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          glow: "var(--accent-glow)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
          shadow: "var(--card-shadow)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
          light: "var(--success-light)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
          light: "var(--warning-light)",
        },
        priority: {
          low: "var(--priority-low)",
          medium: "var(--priority-medium)",
          high: "var(--priority-high)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate, opacitySupportPlugin],
} satisfies Config;
