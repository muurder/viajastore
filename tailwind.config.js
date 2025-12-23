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
          50: '#E6F2EF',
          100: '#CCE5DF',
          200: '#99CBBF',
          300: '#66B19F',
          400: '#33977F',
          500: '#0F4C3A', // Verde Floresta - LUXURY NATURE
          600: '#0C3D2E',
          700: '#092E23',
          800: '#061F17',
          900: '#030F0C',
          foreground: '#ffffff',
        },
        secondary: {
          50: '#F9EDE8',
          100: '#F3DBD1',
          200: '#E7B7A3',
          300: '#DB9375',
          400: '#CF6F47',
          500: '#C66B3D', // Terracota - LUXURY NATURE
          600: '#9E5631',
          700: '#774025',
          800: '#4F2B19',
          900: '#28150C',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#FAFAF9', // Stone 50 - Background Premium
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
        }
      }
    },
  },
  plugins: [],
}