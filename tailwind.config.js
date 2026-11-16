/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      // Breakpoint extra para smartphones médios (>= 375px). Os demais seguem o padrão do Tailwind.
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        space: {
          void: '#02040A',
          deep: '#060D1D',
          panel: '#081226',
          border: '#162847',
          cyan: '#38BDF8',
          ice: '#7DD3FC',
          text: '#F4F7FB',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
