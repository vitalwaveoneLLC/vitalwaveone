/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'card-blue': 'linear-gradient(135deg, #1e40af 0%, #0369a1 100%)',
        'card-orange': 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
        'card-purple': 'linear-gradient(135deg, #6b21a8 0%, #4c1d95 100%)',
        'btn-yellow': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        'btn-cyan': 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
      },
      boxShadow: {
        'premium-sm': '0 4px 20px rgba(0, 0, 0, 0.1)',
        'premium-md': '0 8px 30px rgba(0, 0, 0, 0.15)',
        'premium-lg': '0 20px 50px rgba(0, 0, 0, 0.2)',
        'premium-xl': '0 25px 60px rgba(0, 0, 0, 0.25)',
        'glow-blue': '0 0 30px rgba(59, 130, 246, 0.4)',
        'glow-orange': '0 0 30px rgba(234, 88, 12, 0.4)',
        'glow-purple': '0 0 30px rgba(147, 51, 234, 0.4)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)' },
          '50%': { boxShadow: '0 0 50px rgba(59, 130, 246, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}
