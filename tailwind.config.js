/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/context/**/*.{js,ts,jsx,tsx}",
    "./src/App.tsx",
    "./src/index.tsx"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Playfair Display"', '"Georgia"', 'serif'],
      },
      colors: {
        primary: {
          50: '#f6f7f6',
          100: '#e3e7e3',
          200: '#c7cfc7',
          300: '#a3b3a3',
          400: '#7a907a',
          500: '#5d735d',
          600: '#4a5f4a',
          700: '#3f523f',
          800: '#1a4d2e', // DEFAULT - Verde Musgo Profundo (Deep Forest)
          900: '#3f6212', // Verde Musgo (Moss Green)
          foreground: '#ffffff',
        },
        secondary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#d65a18', // DEFAULT - Terracota/Barro (#d65a18 - hsl(24 85% 45%))
          600: '#b84914',
          700: '#9a3d10',
          800: '#7c310c',
          900: '#5e2509',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#f5f5f4', // Stone 100 - Areia/Neutro
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
        }
      }
    },
  },
  plugins: [],
}