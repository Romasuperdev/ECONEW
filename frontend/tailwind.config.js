/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette officielle Economat — Vert menthe
        brand: {
          50: '#E5FFF7',   // fond clair / cartes (vert pâle)
          100: '#C7F5E7',
          200: '#9CEBD1',
          300: '#66DDB6',
          400: '#33D3A2',
          500: '#00CC8E',  // principal
          600: '#00B37D',
          700: '#009A6B',
          800: '#007E58',  // primaire foncé
          900: '#05543C',
        },
        gold: {
          DEFAULT: '#00CC8E',
          50: '#E5FFF7',
          100: '#C7F5E7',
          400: '#33D3A2',
          500: '#00CC8E',  // accent / CTA
          600: '#00B37D',
          700: '#009A6B',
        },
        turquoise: {
          DEFAULT: '#009A6B',
          400: '#33D3A2',
          500: '#009A6B',  // liens / icônes actives
          600: '#007E58',
        },
        ink: '#5A6B7B',    // texte secondaire
      },
    },
  },
  plugins: [],
}
