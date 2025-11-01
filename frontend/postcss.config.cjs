// Standard PostCSS config for Tailwind CSS
module.exports = {
  // Use the official Tailwind plugin name so PostCSS (used by Vite)
  // expands the @tailwind directives in `src/index.css`.
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
