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
        // ── Semantic tokens — resolve via CSS vars in index.css (light + dark) ──
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          muted:   'rgb(var(--fg-muted) / <alpha-value>)',
          faint:   'rgb(var(--fg-faint) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          up:      'rgb(var(--surface-up) / <alpha-value>)',
        },
        'input-bg':       'rgb(var(--input-bg) / <alpha-value>)',
        subtle:           'rgb(var(--border-subtle) / <alpha-value>)',
        'border-subtle':  'rgb(var(--border-subtle) / <alpha-value>)',
        'border-default': 'rgb(var(--border-default) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
