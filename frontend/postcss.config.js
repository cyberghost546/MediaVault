// PostCSS is the tool that processes your CSS before the browser sees it.
// Tailwind CSS is a PostCSS plugin — without this file, Tailwind's utility
// classes are never generated and the page has no styles at all.
//
// WHY this file is required:
//   Next.js looks for postcss.config.js at startup. If it doesn't find it,
//   it uses a minimal default that does NOT include Tailwind.
//   This file tells PostCSS to run two plugins on every CSS file:
//     1. tailwindcss  — generates all the utility classes (bg-blue-500, flex, etc.)
//     2. autoprefixer — adds vendor prefixes (-webkit-, -moz-) for older browsers

module.exports = {
  plugins: {
    // Run Tailwind CSS — reads tailwind.config.ts to know what to generate.
    tailwindcss: {},

    // Add CSS vendor prefixes automatically so the app works in older browsers.
    autoprefixer: {},
  },
}
