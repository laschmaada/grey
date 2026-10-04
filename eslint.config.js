import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.cjs', 'vite.config.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'scripts/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  // D6/D14 enforcement — restrict in core/engine/sims/systems/content layers
  {
    files: [
      'src/core/**/*.ts',
      'src/engine/**/*.ts',
      'src/sims/**/*.ts',
      'src/systems/**/*.ts',
      'src/content/**/*.ts',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message:
            'D6 ban: core/engine/sims/systems/content must not use Date. Use the virtual clock.',
        },
        { name: 'fetch', message: 'D14 ban: zero network calls. Simulated tools only.' },
        { name: 'XMLHttpRequest', message: 'D14 ban: zero network calls.' },
        { name: 'WebSocket', message: 'D14 ban: zero network calls.' },
        { name: 'EventSource', message: 'D14 ban: zero network calls.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'D6 ban: Math.random() must not appear in core/engine/sims/systems/content. Use the seeded rng.',
        },
        {
          object: 'navigator',
          property: 'sendBeacon',
          message: 'D14 ban: zero network calls.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='innerHTML']",
          message: 'D14 ban: innerHTML — use textContent + safe span construction.',
        },
        {
          selector: "Property[key.name='outerHTML']",
          message: 'D14 ban: outerHTML — use textContent + safe span construction.',
        },
        {
          selector: "MethodCall[property.name='insertAdjacentHTML']",
          message: 'D14 ban: insertAdjacentHTML — use safe DOM construction.',
        },
      ],
    },
  },
);