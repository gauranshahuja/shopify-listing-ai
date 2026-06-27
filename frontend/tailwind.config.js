/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { glow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 80px rgba(132,204,22,0.12)' },
      backgroundImage: {
        mesh: 'radial-gradient(circle at 20% 20%, rgba(163,230,53,0.16), transparent 22%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.14), transparent 20%), radial-gradient(circle at 80% 78%, rgba(163,230,53,0.10), transparent 25%)',
      },
    },
  },
  plugins: [],
}
