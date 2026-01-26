/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#000000',
          darkBlue: '#0A1628',
          deepBlue: '#1E3A5F',
          navy: '#0D2137'
        },
        surface: {
          dark: '#1c1c1e',
          darker: '#2c2c2e',
          light: '#F5F5F7'
        },
        text: {
          primaryDark: '#FFFFFF',
          primaryLight: '#1D1D1F',
          muted: '#86868b'
        },
        accent: {
          blue: '#0071E3',
          cyan: '#22D3EE'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['SF Pro Display', 'Inter', 'sans-serif']
      },
      lineHeight: {
        'tight-heading': '1.05',
        'body': '1.4'
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0A1628 0%, #1E3A5F 50%, #0D2137 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))'
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
