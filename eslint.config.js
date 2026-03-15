const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const globals = require('globals');

module.exports = [
  // --- Ignores ---
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '.vercel/**',
      'eslint.config.js',
      // Frontend build-time configs (ESM, not linted here)
      'frontend/eslint.config.ts',
      'frontend/tailwind.config.ts',
      'frontend/vite.config.ts',
    ],
  },

  // --- Base JS rules (applied everywhere not ignored) ---
  js.configs.recommended,

  // --- TypeScript: turn off no-undef (TS handles it) ---
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-undef': 'off',
    },
  },

  // --- Node.js scripts and root server files ---
  {
    files: ['scripts/**/*.{js,mjs,ts}', 'server.ts', 'server.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // --- API + shared: TypeScript with Node globals ---
  {
    files: ['api/**/*.{ts,js}', 'shared/**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-undef': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // --- Frontend source: React + TypeScript ---
  {
    files: ['frontend/src/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'no-undef': 'off',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
