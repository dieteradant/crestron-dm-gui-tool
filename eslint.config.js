const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'docs/'] },
  js.configs.recommended,
  {
    files: ['server/**/*.js', 'scripts/**/*.js', 'test/**/*.js', '*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    files: ['client/**/*.js', 'client/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  {
    // Puppeteer script: page.evaluate callbacks run in the browser context.
    files: ['scripts/capture-readme-screenshot.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    // xterm is loaded from a CDN as UMD globals.
    files: ['client/js/components/terminal.js'],
    languageOptions: {
      globals: { ...globals.browser, Terminal: 'readonly', FitAddon: 'readonly' },
    },
  },
  {
    files: ['test/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Allow `const { internal, ...public } = obj` omit patterns
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
];
