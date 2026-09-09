/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        app: {
          background: '#020617',
          surface: '#0f172a',
          elevated: '#1e293b',
          primary: '#22d3ee',
          text: '#f8fafc',
          muted: '#94a3b8',
          border: '#1e293b',
          notification: '#f97316',
        },
      },
    },
  },
  plugins: [],
};
