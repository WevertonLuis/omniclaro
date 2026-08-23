/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        claro: {
          red: '#DA291C',
          bubble: '#C8202A',
          dark: '#A9131A',
          rose: '#FDEEEE',
          roseline: '#F6D7D7',
        },
        ink: {
          900: '#16202C',
          700: '#33475B',
          500: '#5A6B7D',
          400: '#8494A5',
        },
        canvas: '#F3F4F6',
        hair: '#E7EAEE',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
      },
    },
  },
  plugins: [],
};
