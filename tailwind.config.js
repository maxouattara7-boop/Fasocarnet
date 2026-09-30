/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1.1rem' }],      // 12px
        'xs': ['0.8125rem', { lineHeight: '1.25rem' }],   // 13px (enhanced from 12px)
        'sm': ['0.9375rem', { lineHeight: '1.375rem' }],  // 15px (enhanced from 14px)
        'base': ['1.0625rem', { lineHeight: '1.625rem' }], // 17px (enhanced from 16px)
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace']
      },
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        om: '#ff6600', // Orange Money
        moov: '#005baa', // Moov Money
        wave: '#1dc4fe', // Wave
      }
    },
  },
  plugins: [],
}
