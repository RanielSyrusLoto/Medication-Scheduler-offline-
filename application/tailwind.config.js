/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medTeal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#2E7D7E',
          600: '#26696a',
          700: '#1d5455',
          800: '#154041',
          900: '#0f2c2d',
        },
        medGreen: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#43A047',
          600: '#388E3C',
        },
        medDark: {
          bg: '#0c1722',
          sidebar: '#09121b',
          card: '#13222f',
          cardHover: '#172838',
          border: '#1c3345',
          subtle: '#223d52',
          textMuted: '#859ba8'
        },
        medLight: {
          bg: '#F3F6F9',
          sidebar: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E3E8EE',
          subtle: '#E8EDF3',
          textMuted: '#8B9DA8'
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        'dark-soft': '0 4px 20px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [],
}
