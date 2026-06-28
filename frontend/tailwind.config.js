/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
          900: '#0f172a',
          850: '#1e293b', // custom mid-slate
          800: '#1e293b',
          700: '#334155',
        },
        primary: {
          500: '#6366f1', // indigo-500
          600: '#4f46e5',
          400: '#818cf8',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-light': '0 4px 16px 0 rgba(255, 255, 255, 0.05)',
      },
      borderColor: {
        'glass': 'rgba(255, 255, 255, 0.08)',
        'glass-hover': 'rgba(255, 255, 255, 0.15)',
      }
    },
  },
  plugins: [],
}
