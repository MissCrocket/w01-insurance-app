module.exports = {
  content: [
    './index.html',
    './js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: "#E0EFFF",
          DEFAULT: "#007BFF",
          dark: "#00234D",
          accent: "#28A745",
        },
        neutral: {
          '50': '#F8F9FA',
          '100': '#F1F3F5',
          '200': '#E9ECEF',
          '300': '#DEE2E6',
          '400': '#CED4DA',
          '500': '#ADB5BD',
          '600': '#868E96',
          '700': '#495057',
          '800': '#343A40',
          '900': '#212529',
        }
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,0.1)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
}