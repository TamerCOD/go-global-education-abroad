/** @type {import('tailwindcss').Config} */
// Ported verbatim from the old CDN inline config in index.html. The sky→indigo,
// cyan→teal, slate→graphite overrides are the CRM/Admin design system — do NOT revert.
export default {
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lidy/**/*.{ts,tsx}',
  ],
  // About.tsx builds `to-${service.color}/10` dynamically — the only constructed
  // class in the codebase. Safelist the resulting literals so JIT keeps them.
  safelist: ['to-brand-600/10', 'to-accent-500/10', 'to-purple-600/10', 'to-pink-500/10'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        accent: {
          // Full amber ramp. 500/600 keep the original values; the other shades
          // are needed so gradient/clip-text classes like `from-accent-400`
          // (Hero headline accent) actually generate — otherwise the text is
          // transparent with no gradient and renders invisible.
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // CRM/Admin design system (public site does not use sky/cyan):
        // sky → indigo accent, cyan → teal secondary, slate → neutral graphite
        sky: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
          400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
          800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
        },
        cyan: {
          50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
          400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
          800: '#115e59', 900: '#134e4a', 950: '#042f2e',
        },
        slate: {
          50: '#f7f8f9', 100: '#eeeff2', 200: '#dee1e6', 300: '#c2c7d0',
          400: '#9aa1ae', 500: '#6e7582', 600: '#4f5560', 700: '#363b45',
          800: '#23262e', 900: '#15171c', 950: '#0b0c0f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
