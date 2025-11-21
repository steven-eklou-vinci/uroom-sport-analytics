/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    colors: {
      primary: '#0F172A', // bleu nuit
      secondary: '#14B8A6', // turquoise
      light: '#F1F5F9', // gris très clair
      dark: '#1E293B', // gris anthracite
      error: '#DC2626', // rouge
      white: '#FFFFFF',
      black: '#000000',
      gray: {
        50: '#F1F5F9',
        100: '#E2E8F0',
        200: '#CBD5E1',
        300: '#94A3B8',
        400: '#64748B',
        500: '#475569',
        600: '#334155',
        700: '#1E293B',
        800: '#0F172A',
      },
      transparent: 'transparent',
    },
    extend: {
      boxShadow: {
        card: '0 2px 8px 0 rgba(16, 30, 54, 0.06)',
      },
      borderRadius: {
        md: '0.5rem',
      },
    },
  },
  plugins: [],
};
