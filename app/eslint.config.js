import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,

  // React config (applies to src/ files)
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: '19.0',
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2024,
        __APP_VERSION__: 'readonly',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,

      // React (JSX transform handles this automatically)
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'warn',
      'react/jsx-no-target-blank': 'error',
      'react/no-unescaped-entities': 'warn',

      // Best practices
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Downgraded to warn: patterns are intentional but should be refactored (see PR#1)
      'react-hooks/set-state-in-effect': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['warn', 'smart'],
      'curly': ['warn', 'multi-line'],
      'yoda': 'warn',
    },
  },

  // Web Worker (ragWorker.js uses `self`)
  {
    files: ['src/services/ragWorker.js'],
    languageOptions: {
      globals: {
        ...globals.worker,
        ...globals.es2024,
      },
    },
  },

  // Test files (vitest globals)
  {
    files: ['src/**/*.test.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },

  // Global ignores
  {
    ignores: [
      'dist/',
      'dev-dist/',
      'node_modules/',
      '*.config.js',
      'public/',
    ],
  },

  // Prettier (must be last to disable conflicting rules)
  prettierConfig,
];
