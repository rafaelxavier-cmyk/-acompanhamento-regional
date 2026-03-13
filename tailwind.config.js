/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0faf4',
          100: '#dcf3e5',
          200: '#bce7cc',
          300: '#8dd4ae',
          400: '#57ba87',
          500: '#339e68',
          600: '#237f53',
          700: '#1c6543',
          800: '#195137',
          900: '#16432e',
          950: '#0b2519',
        }
      }
    }
  },
  plugins: []
}
