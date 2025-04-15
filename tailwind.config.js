/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{html,js}",      // Files in the root
    "./**/*.{html,js}",    // Files in any subdirectory
    "./styles.css"        // Include the main CSS file itself
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#3b82f6',
        'primary-dark': '#1d4ed8',
        'secondary': '#8b5cf6',
        'accent': '#6366f1',
        'dark': '#1e293b',
        'light': '#f8fafc'
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'serif': ['Merriweather', 'ui-serif', 'Georgia'],
      }
    },
  },
  plugins: [],
}
