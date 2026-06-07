const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-undef': 'error',
      'no-empty': 'off',
    },
  },
  {
    files: ['client/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        Terminal: 'readonly',
        FitAddon: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'warn',
      'no-empty': 'off',
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        document: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      'no-undef': 'warn',
      'no-empty': 'off',
    },
  },
  {
    files: ['test/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  {
    ignores: ['node_modules/**', 'graphify-out/**', 'docs/assets/**'],
  },
];
