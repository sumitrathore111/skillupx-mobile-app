/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#13131A',
        border: '#1E1E2E',
        primary: '#6C63FF',
        accent: '#00D9FF',
        success: '#00E676',
        warning: '#FFB300',
        danger: '#FF4757',
        muted: '#6B7280',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        mono: ['JetBrainsMono_400Regular'],
      },
    },
  },
  plugins: [],
};
