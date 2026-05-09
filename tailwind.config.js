/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tarmeemPurple: {
          DEFAULT: '#4A1F66',
          light: '#6B3D87',
          dark: '#3A1652',
        },
        tarmeemTeal: {
          DEFAULT: '#56B894',
          light: '#7AC8AD',
          dark: '#3F9B7A',
        },
      },
    },
  },
  plugins: [],
};
