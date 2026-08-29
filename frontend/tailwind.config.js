/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          sidebar: '#18181b',
          primary: '#15803d',
          primaryHover: '#166534',
          mint: '#e6f4ea',
          mintText: '#0f9f59',
          mintBorder: '#bbf7d0',
          amberBg: '#fff7ed',
          amberText: '#d97706',
          amberBorder: '#ffedd5',
          sentBg: '#f3f4f6',
          sentText: '#4b5563',
          failedBg: '#fef2f2',
          failedText: '#dc2626',
        },
      },
    },
  },
  plugins: [],
};
