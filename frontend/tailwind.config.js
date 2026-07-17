/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette officielle Economat
        brand: {
          50: '#EAF1F8',   // fond clair / cartes
          100: '#d6e3f0',
          200: '#aec6e0',
          300: '#7f9fc6',
          400: '#4f6f9e',
          500: '#324f7d',
          600: '#25406e',
          700: '#1f335a',
          800: '#1b2a4a',  // primaire
          900: '#141f37',
        },
        gold: {
          DEFAULT: '#D9A441',
          50: '#fbf4e4',
          100: '#f3e0b8',
          400: '#e2b661',
          500: '#D9A441',  // accent / CTA
          600: '#c28c2c',
          700: '#9c6f22',
        },
        turquoise: {
          DEFAULT: '#2E9C9C',
          400: '#3fb6b6',
          500: '#2E9C9C',  // liens / icônes actives
          600: '#26807f',
        },
        ink: '#5A6B7B',    // texte secondaire
      },
    },
  },
  plugins: [],
}
