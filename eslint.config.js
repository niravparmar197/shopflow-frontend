import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      'dist-web/**',
      '**/.__mf__temp/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Micro frontend rule: an app never imports another app's code.
      // Talk through @shopflow/shared events or the shared packages instead.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/*/src/**', '../../*/src/**'],
              message: 'Do not import another app. Use @shopflow/shared (events) instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**', '*.config.{js,ts}', 'apps/*/vite.config.ts', 'e2e/**'],
    languageOptions: { globals: { ...globals.node } },
  },
);
