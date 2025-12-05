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
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        secondary: {
          500: '#f97316',
          600: '#ea580c',
        }
      }
    },
  },
  plugins: [],
}