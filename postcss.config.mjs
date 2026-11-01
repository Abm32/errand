// Tailwind v4 via its PostCSS plugin — the standard setup. Turbopack picks this
// up automatically for CSS. This replaces the per-file @tailwindcss/turbopack
// loader, which was being applied to EVERY css import (incl. Bryntum's huge
// gantt.css/fontawesome) and blew the build past 8GB of memory.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
